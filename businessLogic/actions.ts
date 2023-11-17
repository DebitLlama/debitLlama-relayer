import { handleCreatedFixedPayments } from "../handlers/handleCreatedFixedPayments.ts";
import {
  ChainIds,
  PaymentIntentRow,
  PaymentIntentStatus,
  RelayerBalance,
} from "../web3/constants..ts";
import { processJobs } from "../scheduler/process.ts";
import { handleLockedDynamicPayments } from "../handlers/handleLockedDynamicPayments.ts";
import { parseEther } from "../web3/web3.ts";
import {
  getDynamicPayment,
  getFixed,
  lockDynamicPaymentRequests,
  onRelayingSuccess,
  updateRelayerBalanceTooLow,
} from "./fetch.ts";
import { formatEther } from "../ethers.min.js";

export async function processCreatedFixedPayments() {
  const results = await getFixed("CREATED");

  const { data: jobs } = await results.json();

  if (jobs === null || jobs.length === 0) {
    return;
  }

  await processJobs(
    jobs,
    handleCreatedFixedPayments,
  );
}

export async function processRecurringFixedPricedSubscriptions() {
  const results = await getFixed("RECURRING");
  // I need to select the fixed priced payments where the status is recurring and the next payment date is in the past!
  const { data: jobs } = await results.json();

  if (jobs === null || jobs.length === 0) {
    return;
  }
  // I process the recurring fixed priced subscriptions like I processed the created fixed payments
  await processJobs(jobs, handleCreatedFixedPayments);
}

export async function lockDynamicRequestsFetch() {
  const res = await lockDynamicPaymentRequests();
  if (res.status !== 200) {
    console.log(res);
    console.error("Locking dynamic payment requests failed!");
  }
}

export async function processLockedDynamicRequests() {
  const response = await getDynamicPayment();
  const {
    data: selectedJobs,
  } = await response.json();
  if (selectedJobs == null || selectedJobs.length === 0) {
    return;
  }
  //Now I need to relay the payment and do like the fixed payment but use the dynamic amount that was added!
  await processJobs(selectedJobs, handleLockedDynamicPayments);
}

export async function updatePaymentIntentRelayingFailed(arg: {
  chainId: ChainIds;
  paymentIntentId: number;
  relayerBalance: RelayerBalance;
  totalFee: bigint;
}) {
  const newMissingBalance = calculateNewMissingBalance(
    arg.chainId,
    arg.totalFee,
    arg.relayerBalance,
  );

  await updateRelayerBalanceTooLow(
    arg.chainId,
    arg.paymentIntentId,
    newMissingBalance,
    arg.relayerBalance.id,
  );
}

function calculateNewMissingBalance(
  chainId: ChainIds,
  totalFee: bigint,
  relayerBalance: RelayerBalance,
): string {
  switch (chainId) {
    case ChainIds.BTT_TESTNET_ID: {
      const already_missing_amount: bigint = parseEther(
        relayerBalance.Missing_BTT_Donau_Testnet_Balance,
      );

      const newMissingAmount = already_missing_amount + totalFee;

      return formatEther(newMissingAmount);
    }

    case ChainIds.BTT_MAINNET_ID: {
      const already_missing_amount: bigint = parseEther(
        relayerBalance.Missing_BTT_Mainnet_Balance,
      );
      const newMissingAmount = already_missing_amount + totalFee;
      return formatEther(newMissingAmount);
    }

    default:
      return "err";
  }
}

function calculateDebitIntervalDays(debitInterval: number) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + debitInterval);
  return currentDate.toUTCString();
}

export async function updateRelayingSuccess(arg: {
  network: ChainIds;
  payee_user_id: string;
  newRelayerBalance: string;
  allGasUsed: string;
  paymentIntentRow: PaymentIntentRow;
  relayerBalance_id: number;
  submittedTransaction: string;
  commitment: string;
  newAccountBalance: string;
  paymentAmount: string;
}) {
  const used_for = arg.paymentIntentRow.used_for + 1;
  const debitTimes = arg.paymentIntentRow.debitTimes;
  const statusText = used_for - debitTimes === 0
    ? PaymentIntentStatus.PAID
    : PaymentIntentStatus.RECURRING;

  const lastPaymentDate = new Date().toUTCString();

  const nextPaymentDate = statusText === PaymentIntentStatus.RECURRING
    ? calculateDebitIntervalDays(arg.paymentIntentRow.debitInterval)
    : arg.paymentIntentRow.nextPaymentDate; // if it's paid then there is no need to update this

  await onRelayingSuccess({
    chainId: arg.network,
    newRelayerBalance: formatEther(arg.newRelayerBalance),
    payee_user_id: arg.payee_user_id,
    paymentIntentId: arg.paymentIntentRow.id,
    relayerBalanceId: arg.relayerBalance_id,
    submittedTransaction: arg.submittedTransaction,
    allGasUsed: arg.allGasUsed,
    paymentAmount: arg.paymentAmount,
    currency: arg.paymentIntentRow.currency,
    commitment: arg.commitment,
    newAccountBalance: arg.newAccountBalance,
    statusText,
    lastPaymentDate,
    nextPaymentDate,
    used_for,
  });
}

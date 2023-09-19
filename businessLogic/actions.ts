import QueryBuilder from "../db/queryBuilder.ts";
import { handleCreatedFixedPayments } from "../handlers/handleCreatedFixedPayments.ts";
import {
  AccountTypes,
  ChainIds,
  PaymentIntentRow,
  PaymentIntentStatus,
  RelayerBalance,
} from "../web3/constants..ts";
import { processJobs } from "../scheduler/process.ts";
import { handleLockedDynamicPayments } from "../handlers/handleLockedDynamicPayments.ts";
import { parseEther } from "../web3/web3.ts";

/**
 * This will handle the created fixed payments
 * @param queryBuilder
 * @returns
 */
export async function processCreatedFixedPayments(queryBuilder: QueryBuilder) {
  const select = queryBuilder.select();

  const { data: jobs } = await select.PaymentIntents
    .fixedPricingWhereStatusIsCreated();

  if (jobs === null || jobs.length === 0) {
    return;
  }

  await processJobs(
    jobs,
    queryBuilder,
    handleCreatedFixedPayments,
  );
}

export async function processRecurringFixedPricedSubscriptions(
  queryBuilder: QueryBuilder,
) {
  const select = queryBuilder.select();
  // I need to select the fixed priced payments where the status is recurring and the next payment date is in the past!
  const { data: jobs } = await select.PaymentIntents
    .byRecurringTransactionsWherePaymentIsDue();
  if (jobs === null || jobs.length === 0) {
    return;
  }
  // I process the recurring fixed priced subscriptions like I processed the created fixed payments
  await processJobs(jobs, queryBuilder, handleCreatedFixedPayments);
}

export function getTimeToLockDynamicPaymentRequest() {
  const env = Deno.env.get("ENVIRONMENT");
  //For dev I don't enforce a long time
  if (env === "development") {
    return new Date().toUTCString();
  } else {
    const HOUR = 1000 * 60 * 60;
    const anHourAgo = Date.now() - HOUR;
    return new Date(anHourAgo).toUTCString();
  }
}

/**
 * This process will update the created dynamic requests to locked so I can process them
 * @param queryBuilder
 */

export async function lockDynamicRequests(queryBuilder: QueryBuilder) {
  const update = queryBuilder.update();
  const res = await update.DynamicPaymentRequestJobs
    .whereCreatedOlderThan1Hour(getTimeToLockDynamicPaymentRequest());
  console.log(res);
}

export async function processLockedDynamicRequests(queryBuilder: QueryBuilder) {
  const select = queryBuilder.select();
  const {
    data: selectedJobs,
  } = await select.DynamicPaymentRequestJobs.whereStatusIsLocked();
  if (selectedJobs == null || selectedJobs.length === 0) {
    return;
  }
  //Now I need to relay the payment and do like the fixed payment but use the dynamic amount that was added!
  await processJobs(selectedJobs, queryBuilder, handleLockedDynamicPayments);
}

export async function updatePaymentIntentRelayingFailed(arg: {
  chainId: ChainIds;
  queryBuilder: QueryBuilder;
  paymentIntent: string;
  relayerBalance: RelayerBalance;
  totalFee: bigint;
}) {
  const update = arg.queryBuilder.update();
  await update.PaymentIntents.toBalanceTooLowToRelaybyPaymentIntent(
    arg.paymentIntent,
  );

  switch (arg.chainId) {
    case ChainIds.BTT_TESTNET_ID: {
      const already_missing_amount = parseEther(
        arg.relayerBalance.Missing_BTT_Donau_Testnet_Balance,
      );

      const newMissingAmount = already_missing_amount + arg.totalFee;

      await update.RelayerBalance.missingBalanceForBtt_Donau_testnet(
        newMissingAmount,
        arg.relayerBalance.id,
      );
      break;
    }

    default:
      break;
  }
}

export async function updatePayeeRelayerBalanceSwitchNetwork(
  arg: {
    queryBuilder: QueryBuilder;
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
  },
) {
  const {
    queryBuilder,
    network,
    payee_user_id,
    newRelayerBalance,
    allGasUsed,
    paymentIntentRow,
    relayerBalance_id,
    submittedTransaction,
    commitment,
    newAccountBalance,
  } = arg;

  const update = queryBuilder.update();
  const insert = queryBuilder.insert();

  switch (network) {
    // FOR BTT DONAU TESTNET!
    case ChainIds.BTT_TESTNET_ID: {
      // I update the Relayer balance

      await update.RelayerBalance.Btt_donau_Testnet_balanceByUserId(
        newRelayerBalance,
        payee_user_id,
      );

      // Add the transaction to the relayer history
      await insert.RelayerHistory.newTx(
        payee_user_id,
        paymentIntentRow.id,
        relayerBalance_id,
        submittedTransaction,
        allGasUsed,
        network,
        arg.paymentAmount,
        JSON.parse(paymentIntentRow.currency),
      );

      // Update the account balance for both the virtual and the connected wallet!
      await update.Accounts.balanceByCommitment(
        newAccountBalance,
        commitment,
      );

      const used_for = paymentIntentRow.used_for + 1;
      const debitTimes = paymentIntentRow.debitTimes;
      const statusText = used_for - debitTimes === 0
        ? PaymentIntentStatus.PAID
        : PaymentIntentStatus.RECURRING;

      const lastPaymentDate = new Date().toUTCString();

      const nextPaymentDate = statusText === PaymentIntentStatus.RECURRING
        ? calculateDebitIntervalDays(paymentIntentRow.debitInterval)
        : paymentIntentRow.nextPaymentDate; // if it's paid then there is no need to update this

      await update.PaymentIntents.statusAndDatesAfterSuccess(
        statusText,
        lastPaymentDate,
        nextPaymentDate,
        used_for,
        paymentIntentRow.id,
      );
      break;
    }
    default:
      break;
  }
}

function calculateDebitIntervalDays(debitInterval: number) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + debitInterval);
  return currentDate.toUTCString();
}

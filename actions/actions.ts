import {
  ChainIds,
  PaymentIntentRow,
  PaymentIntentStatus,
} from "../web3/constants..ts";
import {
  getDynamicPayment,
  getFixed,
  lockDynamicPaymentRequests,
  onRelayingSuccess,
} from "./fetch.ts";
import {
  setCreatedFixed,
  setDynamicPayment,
  setRecurringFixed,
} from "../kv/kv.ts";

export async function processCreatedFixedPayments() {
  const results = await getFixed("CREATED");

  const { data: jobs } = await results.json();

  console.log("GOT JOBS", jobs.length);
  if (jobs === null || jobs.length === 0) {
    return;
  }
  await setCreatedFixed(jobs);
}

export async function processRecurringFixedPricedSubscriptions() {
  const results = await getFixed("RECURRING");
  // I need to select the fixed priced payments where the status is recurring and the next payment date is in the past!
  const { data: jobs } = await results.json();

  if (jobs === null || jobs.length === 0) {
    return;
  }

  //Here I should add the jobs to KV and keep them in memory

  await setRecurringFixed(jobs);
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

  await setDynamicPayment(selectedJobs);
}

function calculateDebitIntervalDays(debitInterval: number) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + debitInterval);
  return currentDate.toUTCString();
}

export async function updateRelayingSuccess(arg: {
  network: ChainIds;
  payee_user_id: string;
  allGasUsed: string;
  paymentIntentRow: PaymentIntentRow;
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
    payee_user_id: arg.payee_user_id,
    paymentIntentId: arg.paymentIntentRow.id,
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
    paymentIntent: arg.paymentIntentRow.paymentIntent,
  });
}

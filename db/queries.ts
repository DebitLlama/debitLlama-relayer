import { formatEther } from "../ethers.min.js";
import {
  ChainIds,
  DynamicPaymentRequestJobsStatus,
  PaymentIntentRow,
  PaymentIntentStatus,
  Pricing,
} from "../web3/constants..ts";
import { getTimeToLockDynamicPaymentRequest } from "../businessLogic/actions.ts";

// /?TODO: I REFACTOR HOW I ORGANIZE MY QUERIES BECAUSE THEY ARE GETTING OUT OF HAND!
//$
export async function selectPaymentIntentByPaymentIntent(
  supabaseClient: any,
  paymentIntent: string,
) {
  return await supabaseClient.from("PaymentIntents").select("*,account_id(*)")
    .eq(
      "paymentIntent",
      paymentIntent,
    );
}
//$
export async function selectPaymentIntentWhereStatusEqualsCreated(
  supabaseClient: any,
) {
  return await supabaseClient
    .from("PaymentIntents")
    .select("*,account_id(*)")
    .eq("statusText", PaymentIntentStatus.CREATED);
}

//$
export async function selectPayeeRelayerBalance(
  supabaseClient: any,
  payee_id: string,
) {
  return await supabaseClient.from("RelayerBalance").select().eq(
    "user_id",
    payee_id,
  );
}
//$
export async function selectLockedDynamicPaymentRequestJobs(
  supabaseClient: any,
) {
  return await supabaseClient.from("DynamicPaymentRequestJobs").select(
    "*,paymentIntent_id(*,account_id(*),debit_item_id(*))",
  ).eq("status", DynamicPaymentRequestJobsStatus.LOCKED);
}

//$
export async function selectFixedPricedRecurringSubscriptionsWhereThePaymentDateIsDue(
  supabaseClient: any,
) {
  // TODO: I need to filter for Recurring transactions!!
  return await supabaseClient.from("PaymentIntents")
    .select("*,account_id(*),debit_item_id(*)")
    .eq("pricing", Pricing.Fixed)
    .lt("nextPaymentDate", Date.now())
    .eq("statusText", PaymentIntentStatus.RECURRING);
}

//TODO: I need to handle other payments where the account balance or the relayer balance was too low!
//$
export async function updateCreatedDynamicPaymentRequestJobsOlderThan1Hour(
  supabaseClient: any,
) {
  // Update DynamicPaymentRequestJobs
  // Where Status is Created
  // and created_at is less than one hour ago
  return await supabaseClient.from("DynamicPaymentRequestJobs")
    .update({ status: DynamicPaymentRequestJobsStatus.LOCKED })
    .eq("status", DynamicPaymentRequestJobsStatus.CREATED)
    .lt("created_at", getTimeToLockDynamicPaymentRequest());
}

//$
export async function updatePaymentIntentsBalanceTooLowToRelay(
  supabaseClient: any,
  paymentIntent: string,
) {
  return await supabaseClient.from("PaymentIntents").update({
    statusText: PaymentIntentStatus.BALANCETOOLOWTORELAY,
  }).eq("paymentIntent", paymentIntent);
}

//$
export async function updateRelayerMissingBalanceForBTT_Donau_Testnet_Balance(
  supabaseClient: any,
  newMissingAmount: string,
  relayerBalanceId: number,
) {
  return await supabaseClient.from("RelayerBalance").update({
    Missing_BTT_Donau_Testnet_Balance: formatEther(newMissingAmount),
  }).eq("id", relayerBalanceId);
}
//$
export async function updatePaymentIntentBalanceTooLowFixedPayment(arg: {
  chainId: ChainIds;
  supabaseClient: any;
  paymentIntentRow: PaymentIntentRow;
}) {
  // /?TODO: Could send an email after this to notify the user about account balance too low!
  // Also notify the merchant! Maybe hit a webhook about it!
  await arg.supabaseClient.from("PaymentIntents").update({
    statusText: PaymentIntentStatus.ACCOUNTBALANCETOOLOW,
  }).eq("id", arg.paymentIntentRow.id);
}
//$
export async function updateRelayerBalanceBTT_Donau_TestnetBalanceByUserId(
  supabaseClient: any,
  newBalance: any,
  payee_user_id: string,
) {
  return await supabaseClient.from(
    "RelayerBalance",
  ).update({
    BTT_Donau_Testnet_Balance: formatEther(newBalance),
  }).eq("user_id", payee_user_id).select();
}
//$
export async function insertRelayerHistoryTx(
  supabaseClient: any,
  payee_user_id: string,
  paymentIntentId: number,
  relayerBalanceId: number,
  submittedTransaction: string,
  allGasUsed: string,
  network: string,
) {
  return await supabaseClient.from("RelayerHistory")
    .insert({
      created_at: new Date().toISOString(),
      payee_user_id: payee_user_id,
      paymentIntent_id: paymentIntentId,
      relayerBalance_id: relayerBalanceId,
      submittedTransaction,
      allGasUsed,
      network,
    });
}
//$
export async function updateAccountBalanceByCommitment(
  supabaseClient: any,
  newAccountBalance: string,
  commitment: string,
) {
  return await supabaseClient.from("Accounts")
    .update({
      balance: newAccountBalance,
      last_modified: new Date().toISOString(),
    }).eq(
      "commitment",
      commitment,
    );
}
//$
export async function updatePaymentIntentStatusAndDates(
  supabaseClient: any,
  statusText: string,
  lastPaymentDate: string,
  nextPaymentDate: string | null,
  used_for: number,
  paymentIntentRowId: number,
) {
  return await supabaseClient.from(
    "PaymentIntents",
  )
    .update({
      statusText,
      lastPaymentDate,
      nextPaymentDate,
      used_for,
    }).eq("id", paymentIntentRowId);
}

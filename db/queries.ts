import { formatEther, parseEther } from "../ethers.min.js";
import { ChainIds } from "../web3/constants..ts";

export enum PaymentIntentStatus {
  CREATED = "Created",
  CANCELLED = "Cancelled",
  RECURRING = "Recurring",
  PAID = "Paid",
  BALANCETOOLOWTORELAY = "Balance too low to relay",
  ACCOUNTBALANCETOOLOW = "Account Balance too low",
}

export type Account = {
  id: number;
  created_at: string;
  user_id: string;
  network_id: string;
  commitment: string;
  name: string;
  closed: boolean;
  currency: string;
  balance: string;
};

export type PaymentIntentRow = {
  id: number;
  created_at: string;
  creator_user_id: number;
  payee_user_id: string;
  account_id: Account;
  payee_address: string;
  maxDebitAmount: string;
  debitTimes: number;
  debitInterval: number;
  paymentIntent: string;
  commitment: string;
  estimatedGas: string;
  statusText: string;
  lastPaymentDate: string | null;
  nextPaymentDate: string | null;
  pricing: string;
  currency: string;
  network: string;
  debit_item_id: number;
  used_for: number;
  proof: string;
  publicSignals: string;
};

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

export type RelayerBalance = {
  id: number;
  created_at: string;
  BTT_Donau_Testnet_Balance: string;
  Missing_BTT_Donau_Testnet_Balance: string;
  user_id: string;
  last_topup: string;
};

export async function selectPayeeRelayerBalance(
  supabaseClient: any,
  payee_id: string,
) {
  return await supabaseClient.from("RelayerBalance").select().eq(
    "user_id",
    payee_id,
  );
}

//TODO: This function has a network switch! Implement it for other networks too!
export async function updatePaymentIntentRelayingFailed(arg: {
  chainId: ChainIds;
  supabaseClient: any;
  paymentIntent: string;
  relayerBalance: RelayerBalance;
  totalFee: bigint;
}) {
  console.log("updatePaymentIntentRelayingFailed", arg);

  await arg.supabaseClient.from("PaymentIntents").update({
    statusText: PaymentIntentStatus.BALANCETOOLOWTORELAY,
  }).eq("paymentIntent", arg.paymentIntent);

  switch (arg.chainId) {
    case ChainIds.BTT_TESTNET_ID: {
      const already_missing_amount = parseEther(
        arg.relayerBalance.Missing_BTT_Donau_Testnet_Balance,
      );

      const newMissingAmount = already_missing_amount + arg.totalFee;

      console.log(newMissingAmount);

      const res2 = await arg.supabaseClient.from("RelayerBalance").update({
        Missing_BTT_Donau_Testnet_Balance: formatEther(newMissingAmount),
      }).eq("id", arg.relayerBalance.id);

      console.log("updating relayer balance missing amount", res2);
      break;
    }

    default:
      break;
  }
}

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

export async function updatePayeeRelayerBalanceSwitchNetwork(
  arg: {
    supabaseClient: any;
    network: ChainIds;
    payee_user_id: string;
    previousBalance: string;
    allGasUsed: string;
    paymentIntentRow: PaymentIntentRow;
    relayerBalance_id: number;
    submittedTransaction: string;
    commitment: string;
    newAccountBalance: string;
  },
) {
  const {
    supabaseClient,
    network,
    payee_user_id,
    previousBalance,
    allGasUsed,
    paymentIntentRow,
    relayerBalance_id,
    submittedTransaction,
    commitment,
    newAccountBalance,
  } = arg;

  const newBalance = parseEther(previousBalance) - parseEther(allGasUsed);

  switch (network) {
    // FOR BTT DONAU TESTNET!
    case ChainIds.BTT_TESTNET_ID: {
      // I update the Relayer balance
      await supabaseClient.from(
        "RelayerBalance",
      ).update({
        BTT_Donau_Testnet_Balance: formatEther(newBalance),
      }).eq("user_id", payee_user_id).select();

      // Add the transaction to the relayer history

      await supabaseClient.from("RelayerHistory")
        .insert({
          created_at: new Date().toISOString(),
          payee_user_id: payee_user_id,
          paymentIntent_id: paymentIntentRow.id,
          relayerBalance_id,
          submittedTransaction,
          allGasUsed,
          network,
        });
      // Update the account balance!

      await supabaseClient.from("Accounts")
        .update({
          balance: newAccountBalance,
          last_modified: new Date().toISOString(),
        }).eq(
          "commitment",
          commitment,
        );

      const used_for = paymentIntentRow.used_for + 1;
      const debitTimes = paymentIntentRow.debitTimes;
      const statusText = used_for - debitTimes === 0
        ? PaymentIntentStatus.PAID
        : PaymentIntentStatus.RECURRING;

      const lastPaymentDate = new Date().toISOString();

      const nextPaymentDate = statusText === PaymentIntentStatus.RECURRING
        ? calculateDebitIntervalDays(paymentIntentRow.debitInterval)
        : paymentIntentRow.nextPaymentDate; // if it's paid then there is no need to update this

      await supabaseClient.from(
        "PaymentIntents",
      )
        .update({
          statusText,
          lastPaymentDate,
          nextPaymentDate,
          used_for,
        }).eq("id", paymentIntentRow.id);
      break;
    }
    default:
      break;
  }
}

function calculateDebitIntervalDays(debitInterval: number) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + debitInterval);
  return currentDate.toLocaleString();
}

import { parseEther } from "../ethers.min.js";
import {
  ChainIds,
  PaymentIntentRow,
  PaymentIntentStatus,
  RelayerBalance,
} from "../web3/constants..ts";
import {
  insertRelayerHistoryTx,
  updateAccountBalanceByCommitment,
  updatePaymentIntentStatusAndDates,
  updateRelayerBalanceBTT_Donau_TestnetBalanceByUserId,
} from "./queries.ts";
import QueryBuilder from "./queryBuilder.ts";

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
    queryBuilder,
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

  const newBalance: any = parseEther(previousBalance) - parseEther(allGasUsed);
  const update = queryBuilder.update();
  const insert = queryBuilder.insert();
  switch (network) {
    // FOR BTT DONAU TESTNET!
    case ChainIds.BTT_TESTNET_ID: {
      // I update the Relayer balance

      await update.RelayerBalance.Btt_donau_Testnet_balanceByUserId(
        newBalance,
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
      );

      // Update the account balance!

      await update.Accounts.balanceByCommitment(
        newAccountBalance,
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

//This is business logic!
function calculateDebitIntervalDays(debitInterval: number) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + debitInterval);
  return currentDate.toLocaleString();
}

export function getTimeToLockDynamicPaymentRequest() {
  const env = Deno.env.get("ENVIRONMENT") || "development";
  //For dev I don't enforce a long time
  if (env === "development") {
    return Date.now();
  } else {
    const HOUR = 1000 * 60 * 60;
    const anHourAgo = Date.now() - HOUR;
    return anHourAgo;
  }
}

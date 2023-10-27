import { formatEther } from "../ethers.min.js";
import {
  DynamicPaymentRequestJobsStatus,
  PaymentIntentStatus,
  Pricing,
} from "../web3/constants..ts";
export type SupabaseQueryResult = {
  error: any;
  data: any;
  count: any;
  status: number;
  statusText: string;
};

export default class QueryBuilder {
  client: any;

  constructor(client: any) {
    this.client = client;
  }

  select() {
    return {
      PaymentIntents: {
        //selectPaymentIntentByPaymentIntent
        byPaymentIntent: async (paymentIntent: string) => {
          const res = await this.client.from("PaymentIntents").select(
            "*,account_id(*)",
          )
            .eq(
              "paymentIntent",
              paymentIntent,
            );
          return this.responseHandler(res, "byPaymentIntent", {
            paymentIntent,
          });
        },
        //selectPaymentIntentWhereStatusEqualsCreated
        fixedPricingWhereStatusIsCreated: async () => {
          const res = await this.client.from("PaymentIntents")
            .select("*,account_id(*)")
            .eq("statusText", PaymentIntentStatus.CREATED)
            .eq("pricing", Pricing.Fixed);

          return this.responseHandler(
            res,
            "fixedPricingWhereStatusIsCreated",
            {},
          );
        },
        //selectFixedPricedRecurringSubscriptionsWhereThePaymentDateIsDue
        byRecurringTransactionsWherePaymentIsDue: async () => {
          const res = await this.client.from("PaymentIntents")
            .select("*,account_id(*),debit_item_id(*)")
            .eq("pricing", Pricing.Fixed)
            .lt("nextPaymentDate", new Date().toUTCString())
            .eq("statusText", PaymentIntentStatus.RECURRING);

          return this.responseHandler(
            res,
            "byRecurringTransactionsWherePaymentIsDue",
            {},
          );
        },
      },
      RelayerBalance: {
        //selectPayeeRelayerBalance
        byUserId: async (payee_id: string) => {
          const res = await this.client.from("RelayerBalance")
            .select().eq(
              "user_id",
              payee_id,
            );
          return this.responseHandler(res, "byUserId", { payee_id });
        },
      },
      DynamicPaymentRequestJobs: {
        //selectLockedDynamicPaymentRequestJobs
        whereStatusIsLocked: async () => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .select(
              "*,paymentIntent_id(*,account_id(*),debit_item_id(*),relayerBalance_id(*))",
            ).eq("status", DynamicPaymentRequestJobsStatus.LOCKED);
          return this.responseHandler(res, "whereStatusIsLocked", {});
        },
      },
      RPC: {
        emailByUserId: async (user_id: string) => {
          const res = await this.client.rpc("get_email_by_user_uuid2", {
            user_id,
          });
          return this.responseHandler(res, "emailByUserId", {});
        },
      },
    };
  }

  insert() {
    return {
      RelayerHistory: {
        //insertRelayerHistoryTx
        newTx: async (
          payee_user_id: string,
          paymentIntentId: number,
          relayerBalanceId: number,
          submittedTransaction: string,
          allGasUsed: string,
          network: string,
          paymentAmount: string,
          paymentCurrency: string,
        ) => {
          const res = await this.client.from("RelayerHistory")
            .insert({
              created_at: new Date().toUTCString(),
              payee_user_id: payee_user_id,
              paymentIntent_id: paymentIntentId,
              relayerBalance_id: relayerBalanceId,
              submittedTransaction,
              allGasUsed,
              network,
              paymentAmount,
              paymentCurrency,
            });

          return this.responseHandler(res, "newTx", {});
        },
      },
    };
  }

  update() {
    return {
      PaymentIntents: {
        //updatePaymentIntentsBalanceTooLowToRelay
        toBalanceTooLowToRelaybyPaymentIntent: async (
          paymentIntent: string,
        ) => {
          const res = await this.client.from("PaymentIntents").update({
            statusText: PaymentIntentStatus.BALANCETOOLOWTORELAY,
          }).eq("paymentIntent", paymentIntent);
          return this.responseHandler(
            res,
            "toBalanceTooLowToRelaybyPaymentIntent",
            { paymentIntent },
          );
        },
        //updatePaymentIntentBalanceTooLowFixedPayment
        accountBalanceTooLowByPaymentIntentId: async (
          paymentIntentId: number,
        ) => {
          const res = await this.client.from("PaymentIntents").update({
            statusText: PaymentIntentStatus.ACCOUNTBALANCETOOLOW,
          }).eq("id", paymentIntentId);

          return this.responseHandler(
            res,
            "accountBalanceTooLowByPaymentIntentId",
            { paymentIntentId },
          );
        },
        accountBalanceTooLowForDynamicPaymentByPaymentIntentId: async (
          paymentIntentId: number,
          missingAmount: string,
        ) => {
          const res = await this.client.from("PaymentIntents").update({
            statusText: PaymentIntentStatus.ACCOUNTBALANCETOOLOW,
            failedDynamicPaymentAmount: missingAmount,
          }).eq("id", paymentIntentId);
          return this.responseHandler(
            res,
            "accountBalanceTooLowForDynamicPaymentByPaymentIntentId",
            { paymentIntentId, missingAmount },
          );
        },
        //updatePaymentIntentStatusAndDates
        statusAndDatesAfterSuccess: async (
          statusText: string,
          lastPaymentDate: string,
          nextPaymentDate: string | null,
          used_for: number,
          paymentIntentRowId: number,
        ) => {
          const res = await this.client.from(
            "PaymentIntents",
          )
            .update({
              statusText,
              lastPaymentDate,
              nextPaymentDate,
              used_for,
            }).eq("id", paymentIntentRowId);
          return this.responseHandler(res, "statusAndDatesAfterSuccess", {
            statusText,
            lastPaymentDate,
            nextPaymentDate,
            used_for,
            paymentIntentRowId,
          });
        },
      },

      DynamicPaymentRequestJobs: {
        //updateCreatedDynamicPaymentRequestJobsOlderThan1Hour
        whereCreatedOlderThan1Hour: async (
          timeToLockDynamicPaymentRequest: string,
        ) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .update({ status: DynamicPaymentRequestJobsStatus.LOCKED })
            .eq("status", DynamicPaymentRequestJobsStatus.CREATED)
            .lt("created_at", timeToLockDynamicPaymentRequest);

          return this.responseHandler(res, "whereCreatedOlderThan1Hour", {
            timeToLockDynamicPaymentRequest,
          });
        },
        unlockById: async (dynamicPaymentRequestId: number) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .update({ status: DynamicPaymentRequestJobsStatus.CREATED })
            .eq("status", DynamicPaymentRequestJobsStatus.LOCKED)
            .eq("id", dynamicPaymentRequestId);

          return this.responseHandler(res, "unlockById", {
            dynamicPaymentRequestId,
          });
        },
        statusToRejectedById: async (paymentRequest_id: number) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .update({ status: DynamicPaymentRequestJobsStatus.REJECETED })
            .eq("id", paymentRequest_id);

          return this.responseHandler(res, "statusToRejectedById", {
            paymentRequest_id,
          });
        },
        statusToCompletedById: async (paymentRequest_id: number) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .update({ status: DynamicPaymentRequestJobsStatus.COMPLETED })
            .eq("id", paymentRequest_id);
          return this.responseHandler(res, "statusToCompletedById", {
            paymentRequest_id,
          });
        },
      },
      //updateAccountBalanceByCommitment
      Accounts: {
        balanceByCommitment: async (
          newAccountBalance: string,
          commitment: string,
        ) => {
          const res = await this.client.from("Accounts")
            .update({
              balance: newAccountBalance,
              last_modified: new Date().toUTCString(),
            }).eq(
              "commitment",
              commitment,
            );
          return this.responseHandler(res, "balanceByCommitment", {
            newAccountBalance,
            commitment,
          });
        },
      },
      RelayerBalance: {
        //updateRelayerMissingBalanceForBTT_Donau_Testnet_Balance
        missingBalanceForBtt_Donau_testnet: async (
          newMissingAmount: string,
          relayerBalanceId: number,
        ) => {
          const res = await this.client.from("RelayerBalance").update({
            Missing_BTT_Donau_Testnet_Balance: formatEther(newMissingAmount),
          }).eq("id", relayerBalanceId);
          return this.responseHandler(
            res,
            "missingBalanceForBtt_Donau_testnet",
            { newMissingAmount, relayerBalanceId },
          );
        },
        missingBalanceForBtt_Mainnet: async (
          newMissingAmount: string,
          relayerBalanceId: number,
        ) => {
          const res = await this.client.from("RelayerBalance").update({
            Missing_BTT_Mainnet_Balance: formatEther(newMissingAmount),
          }).eq("id", relayerBalanceId);
          return this.responseHandler(res, "missingBalanceForBtt_Mainnet", {
            newMissingAmount,
            relayerBalanceId,
          });
        },
        //updateRelayerBalanceBTT_Donau_TestnetBalanceByUserId
        Btt_donau_Testnet_balanceByUserId: async (
          newBalance: any,
          payee_user_id: string,
        ) => {
          const res = await this.client.from(
            "RelayerBalance",
          ).update({
            BTT_Donau_Testnet_Balance: formatEther(newBalance),
          }).eq("user_id", payee_user_id).select();
          return this.responseHandler(
            res,
            "Btt_donau_Testnet_balanceByUserId",
            { newBalance, payee_user_id },
          );
        },
        Btt_mainnet_balanceByUserId: async (
          newBalance: any,
          payee_user_id: string,
        ) => {
          const res = await this.client.from(
            "RelayerBalance",
          ).update({
            BTT_Mainnet_Balance: formatEther(newBalance),
          }).eq("user_id", payee_user_id).select();
          return this.responseHandler(res, "Btt_mainnet_balanceByUserId", {
            newBalance,
            payee_user_id,
          });
        },
      },
    };
  }

  delete() {
    return {};
  }

  responseHandler(
    res: SupabaseQueryResult,
    functionName: string,
    args: object,
  ) {
    if (res.error !== null) {
      console.log(
        "QUERY ERROR! ",
        functionName,
        " ARGS: ",
        JSON.stringify(args),
      );
      console.log(res.error);
    }
    return { ...res };
  }
}

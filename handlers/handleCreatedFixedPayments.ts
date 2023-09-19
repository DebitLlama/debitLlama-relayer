import { formatEther } from "../ethers.min.js";
import {
  ChainIds,
  PaymentIntentRow,
  PaymentIntentStatus,
  RelayerBalance,
} from "../web3/constants..ts";
import {
  getRelayerBalanceForChainId,
  parseEther,
  relayPayment,
  transactionGasCalculationsForFixedPayments,
} from "../web3/web3.ts";
import {
  updatePayeeRelayerBalanceSwitchNetwork,
  updatePaymentIntentRelayingFailed,
} from "../businessLogic/actions.ts";
import QueryBuilder from "../db/queryBuilder.ts";

/**
 * Relay the direct debit transaction and save the details in the database!
 * @param queryBuilder
 * @paymentIntentRow
 * @returns void
 */

export async function handleCreatedFixedPayments(
  queryBuilder: QueryBuilder,
  paymentIntentRow: PaymentIntentRow,
) {
  console.log(
    "Starting to handle a payment intent with created state and fixed pricing",
  );
  const chainId = paymentIntentRow.network as ChainIds;
  const select = queryBuilder.select();
  const update = queryBuilder.update();
  const { data: payeeRelayerBalanceArray } = await select.RelayerBalance
    .byUserId(
      paymentIntentRow.payee_user_id,
    );

  const relayerBalance = payeeRelayerBalanceArray[0] as RelayerBalance;
  const proof = paymentIntentRow.proof;
  const publicSignals = paymentIntentRow.publicSignals;
  const gasCalculations = await transactionGasCalculationsForFixedPayments({
    proof,
    publicSignals,
    paymentIntentRow,
    chainId,
    relayerBalance,
  });

  //If estimate gas was successful but the relayer don't have enough balance:
  if (
    gasCalculations.relayerBalanceEnough === false &&
    gasCalculations.errored === false
  ) {
    if (
      paymentIntentRow.statusText !== PaymentIntentStatus.BALANCETOOLOWTORELAY
    ) {
      await updatePaymentIntentRelayingFailed({
        chainId,
        queryBuilder: queryBuilder,
        paymentIntent: paymentIntentRow.paymentIntent,
        relayerBalance,
        totalFee: gasCalculations.totalFee,
      });
    }
  }

  // if estimate gas failed and the account don't have enough balance

  if (
    gasCalculations.errored === true &&
    gasCalculations.accountBalanceEnough === false
  ) {
    await update.PaymentIntents.accountBalanceTooLowByPaymentIntentId(
      paymentIntentRow.id,
    );
  }

  if (
    gasCalculations.relayerBalanceEnough === false ||
    gasCalculations.errored === true
  ) {
    // if something went wrong return now
    // Relayer balance is not enough or the estimateGas threw an error I abort the mission
    return;
  }

  // Now I can relay the transaction since the relayer has enough balance and the tx succeeded!
  const tx = await relayPayment(
    {
      proof,
      publicSignals,
      payeeAddress: paymentIntentRow.payee_address,
      maxDebitAmount: paymentIntentRow.maxDebitAmount,
      actualDebitedAmount: paymentIntentRow.maxDebitAmount,
      debitTimes: paymentIntentRow.debitTimes,
      debitInterval: paymentIntentRow.debitInterval,
    },
    chainId,
    gasCalculations.gasLimit,
    gasCalculations.gasPrice,
    paymentIntentRow.account_id.accountType,
  ).catch((err) => {
    return false;
  });

  if (!tx) {
    // If the transaction fails for some reason I don't do anything and can try it again later!
    return;
  }

  //Get the relayer balance from the database
  const currentRelayerBalance = getRelayerBalanceForChainId(
    chainId,
    relayerBalance,
  );

  await tx.wait().then(async (receipt: any) => {
    if (receipt.status === 1) {
      const fee = receipt.fee;
      const newAccountBalance =
        parseEther(paymentIntentRow.account_id.balance) -
        parseEther(paymentIntentRow.maxDebitAmount);
      // update the database with the details of the relayed transaction
      const newRelayerBalance: any = parseEther(currentRelayerBalance) - fee;

      await updatePayeeRelayerBalanceSwitchNetwork({
        queryBuilder,
        network: chainId,
        payee_user_id: paymentIntentRow.payee_user_id,
        newRelayerBalance,
        allGasUsed: formatEther(fee),
        paymentIntentRow: paymentIntentRow,
        relayerBalance_id: relayerBalance.id,
        submittedTransaction: receipt.hash,
        commitment: paymentIntentRow.commitment,
        newAccountBalance: formatEther(newAccountBalance),
        paymentAmount: paymentIntentRow.maxDebitAmount,
      });
      return;
    } else {
      //TODO: Tx failed, SHould not occur as estiamteGas runs before,
      //I don't change the database so nothing happens
    }
  });
}

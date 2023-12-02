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
  updatePaymentIntentRelayingFailed,
  updateRelayingSuccess,
} from "../businessLogic/actions.ts";
import {
  getRelayerBalance,
  updateAccountBalanceTooLow,
} from "../businessLogic/fetch.ts";

/**
 * Relay the direct debit transaction and save the details in the database!
 * @param queryBuilder
 * @paymentIntentRow
 * @returns void
 */

export async function handleCreatedFixedPayments(
  paymentIntentRow: PaymentIntentRow,
) {
  console.log(
    "Starting to handle a payment intent with created state and fixed pricing",
  );
  const chainId = paymentIntentRow.network as ChainIds;
  const { data: payeeRelayerBalanceArray } = await getRelayerBalance(
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

  console.log(gasCalculations);
  console.log(formatEther(gasCalculations.totalFee));

  //If estimate gas was successful but the relayer don't have enough balance:
  if (
    gasCalculations.relayerBalanceEnough === false &&
    gasCalculations.errored === false
  ) {
    if (
      paymentIntentRow.statusText !== PaymentIntentStatus.BALANCETOOLOWTORELAY
    ) {
      console.log("update payment intent relaying failed");
      await updatePaymentIntentRelayingFailed({
        chainId,
        paymentIntentId: paymentIntentRow.id,
        relayerBalance,
        totalFee: gasCalculations.totalFee,
        paymentIntent: paymentIntentRow.paymentIntent,
      }).catch(console.error);
    }
  }

  // if estimate gas failed and the account don't have enough balance

  if (
    gasCalculations.errored === true &&
    gasCalculations.accountBalanceEnough === false
  ) {
    console.log("updateAccountBalanceTooLow");
    await updateAccountBalanceTooLow(
      paymentIntentRow.id,
      paymentIntentRow.paymentIntent,
    ).catch(console.error);
  }

  if (
    gasCalculations.relayerBalanceEnough === false ||
    gasCalculations.errored === true
  ) {
    // if something went wrong return now
    // Relayer balance is not enough or the estimateGas threw an error I abort the mission
    console.log(
      "Relayer balance is not enough or the estimateGas threw an error I abort the mission",
    );
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
    console.error(err);
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

      await updateRelayingSuccess({
        network: chainId,
        payee_user_id: paymentIntentRow.payee_user_id,
        newRelayerBalance,
        allGasUsed: formatEther(fee),
        paymentIntentRow,
        relayerBalance_id: relayerBalance.id,
        submittedTransaction: receipt.hash,
        commitment: paymentIntentRow.commitment,
        newAccountBalance: formatEther(newAccountBalance),
        paymentAmount: paymentIntentRow.maxDebitAmount,
      }).catch(console.error);

      return;
    } else {
      //TODO: Tx failed, SHould not occur as estiamteGas runs before,
      //I don't change the database so nothing happens
    }
  }).catch(console.error);
}

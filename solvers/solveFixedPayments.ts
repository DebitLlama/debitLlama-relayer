import { formatEther } from "../ethers.min.js";
import { ChainIds, PaymentIntentRow } from "../web3/constants..ts";
import {
  parseEther,
  relayPayment,
  transactionGasCalculationsForFixedPayments,
} from "../web3/web3.ts";
import { updateRelayingSuccess } from "../actions/actions.ts";
import { updateAccountBalanceTooLow } from "../actions/fetch.ts";

/**
 * Relay the direct debit transaction and save the details in the database!
 * @returns void
 */

export async function solveFixedPayments(
  paymentIntentRow: PaymentIntentRow,
) {
  console.log(
    "Starting to handle a payment intent with created state and fixed pricing",
  );
  const chainId = paymentIntentRow.network as ChainIds;

  const proof = paymentIntentRow.proof;
  const publicSignals = paymentIntentRow.publicSignals;
  const gasCalculations = await transactionGasCalculationsForFixedPayments({
    proof,
    publicSignals,
    paymentIntentRow,
    chainId,
  });

  console.log(gasCalculations);

  // if estimate gas failed and the account don't have enough balance

  if (
    gasCalculations.errored === true &&
    gasCalculations.accountBalanceEnough === false
  ) {
    await updateAccountBalanceTooLow(
      paymentIntentRow.id,
      paymentIntentRow.paymentIntent,
    ).catch(console.error);
  }

  if (
    gasCalculations.errored === true
  ) {
    // if something went wrong return now
    // The estimateGas threw an error I abort the mission
    console.log(
      "Estimate gas failed",
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

  await tx.wait().then(async (receipt: any) => {
    if (receipt.status === 1) {
      const fee = receipt.fee;
      const newAccountBalance =
        parseEther(paymentIntentRow.account_id.balance) -
        parseEther(paymentIntentRow.maxDebitAmount);
      // update the database with the details of the relayed transaction

      await updateRelayingSuccess({
        network: chainId,
        payee_user_id: paymentIntentRow.payee_user_id,
        allGasUsed: formatEther(fee),
        paymentIntentRow,
        submittedTransaction: receipt.hash,
        commitment: paymentIntentRow.commitment,
        newAccountBalance: formatEther(newAccountBalance),
        paymentAmount: paymentIntentRow.maxDebitAmount,
      }).catch(console.error);

      return;
    } else {
      //TODO: Tx failed, SHould not occur as estiamteGas runs before,
      //I don't change the database so nothing happens, the payment intent can retry later
    }
  }).catch(console.error);
}

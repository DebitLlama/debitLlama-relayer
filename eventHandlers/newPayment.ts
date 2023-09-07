import { formatEther, parseEther } from "../ethers.min.js";
import {
  PaymentIntentRow,
  PaymentIntentStatus,
  RelayerBalance,
  selectPayeeRelayerBalance,
  selectPaymentIntentByPaymentIntent,
  updatePayeeRelayerBalanceSwitchNetwork,
  updatePaymentIntentBalanceTooLowFixedPayment,
  updatePaymentIntentRelayingFailed,
} from "../db/queries.ts";
import { ChainIds } from "../web3/constants..ts";
import {
  getRelayerBalanceForChainId,
  relayPayment,
  transactionGasCalculations,
} from "../web3/web3.ts";

// New Payment Handler is only

interface Payload {
  paymentIntent: string;
}

interface NewFixedPaymentEvent {
  event: "newFixedPayment";
  payload: {
    paymentIntent: string;
  };
  type: "broadcast";
}

/**
 * Relay the direct debit transaction and save the details in the database!
 * @param client
 * @param event
 * @returns void
 */

export async function newFixedPaymentHandler(
  client: any,
  event: NewFixedPaymentEvent,
) {
  const paymentIntent = event.payload.paymentIntent;
  // Check the relayer balance for the payee
  const { data: paymentIntentRowArray, error: paymentIntentRowError } =
    await selectPaymentIntentByPaymentIntent(
      client,
      paymentIntent,
    );

  const paymentIntentRow = paymentIntentRowArray[0] as PaymentIntentRow;

  const chainId = paymentIntentRow.network as ChainIds;

  const { data: payeeRelayerBalanceArray, error: payeeRelayerBalanceError } =
    await selectPayeeRelayerBalance(
      client,
      paymentIntentRow.payee_user_id,
    );

  const relayerBalance = payeeRelayerBalanceArray[0] as RelayerBalance;
  const proof = paymentIntentRow.proof;
  const publicSignals = paymentIntentRow.publicSignals;

  const gasCalculations = await transactionGasCalculations({
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
        supabaseClient: client,
        paymentIntent,
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
    // If the account don't have enough balance I update the status of the payment intent!
    await updatePaymentIntentBalanceTooLowFixedPayment({
      chainId,
      supabaseClient: client,
      paymentIntentRow,
    });
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

      await updatePayeeRelayerBalanceSwitchNetwork({
        supabaseClient: client,
        network: chainId,
        payee_user_id: paymentIntentRow.payee_user_id,
        previousBalance: currentRelayerBalance,
        allGasUsed: formatEther(fee),
        paymentIntentRow: paymentIntentRow,
        relayerBalance_id: relayerBalance.id,
        submittedTransaction: receipt.hash,
        commitment: paymentIntentRow.commitment,
        newAccountBalance: formatEther(newAccountBalance),
      });
      return;
    } else {
    }
  });
}

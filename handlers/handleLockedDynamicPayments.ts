import { updatePayeeRelayerBalanceSwitchNetwork } from "../businessLogic/actions.ts";
import QueryBuilder from "../db/queryBuilder.ts";
import { doSendMailTo, SendMailReason } from "../emails/mailer.ts";
import { formatEther } from "../ethers.min.js";
import { ChainIds, DynamicPaymentRequestJobRow } from "../web3/constants..ts";
import {
  getRelayerBalanceForChainId,
  parseEther,
  relayPayment,
  transactionGasCalculationsForDynamicPayments,
} from "../web3/web3.ts";

export async function handleLockedDynamicPayments(
  queryBuilder: QueryBuilder,
  paymentRequest: DynamicPaymentRequestJobRow,
) {
  console.log("Starting to handle a dynamic payment for a payment intent!");
  const paymentIntentRow = paymentRequest.paymentIntent_id;
  const chainId = paymentIntentRow.network as ChainIds;
  const proof = paymentIntentRow.proof;
  const publicSignals = paymentIntentRow.publicSignals;
  const allocatedGas = paymentRequest.allocatedGas;
  const update = queryBuilder.update();
  const select = queryBuilder.select();

  const payeeEmailData = await select.RPC.emailByUserId(
    paymentIntentRow.payee_user_id,
  );
  const payeeEmail = payeeEmailData.data[0].email;
  const customerEmailData = await select.RPC.emailByUserId(
    paymentIntentRow.creator_user_id,
  );
  const customerEmail = customerEmailData.data[0].email;
  //Relayer balance was already allocated so I don't need to handle relayer gas here. Phew!

  //Estimate Gas for the transaction and check if the Allocated Gas covers it!
  const gasCalculations = await transactionGasCalculationsForDynamicPayments({
    proof,
    publicSignals,
    paymentIntentRow,
    chainId,
    allocatedGas,
    dynamicPaymentAmount: paymentRequest.requestedAmount,
  });

  // If the allocatedGas doesn't cover it anymore,
  // I unlock the dynamic payment request and return, I will try again later when the gas prices change
  if (
    gasCalculations.allocatedGasEnough === false &&
    gasCalculations.errored === false
  ) {
    await update.DynamicPaymentRequestJobs.unlockById(paymentRequest.id).then(
      async () => {
        await doSendMailTo(SendMailReason.DynamicPaymentRequestRejected, {
          billedAmount: `${paymentIntentRow.maxDebitAmount} ${
            JSON.parse(paymentIntentRow.currency).name
          }`,
          subscriptionLink:
            `https://debitllama.com/app/payeePaymentIntents?q=${paymentIntentRow.paymentIntent}`,
        }, payeeEmail);
      },
    );

    return;
  }

  // If there was an error with estimate gas I reject the transaction!
  if (gasCalculations.errored) {
    await update.DynamicPaymentRequestJobs.statusToRejectedById(
      paymentRequest.id,
    );
    // if the account balance is too low I will update the payment intent
    if (gasCalculations.accountBalanceEnough === false) {
      // save the dynamic payment balance to show on the UI for the account owner!
      await update.PaymentIntents
        .accountBalanceTooLowForDynamicPaymentByPaymentIntentId(
          paymentIntentRow.id,
          paymentRequest.requestedAmount,
        ).then(async () => {
          //Notify the customer about the failed payment!

          await doSendMailTo(SendMailReason.PaymentFailureCustomer, {
            billedAmount: `${paymentIntentRow.maxDebitAmount} ${
              JSON.parse(paymentIntentRow.currency).name
            }`,
            subscriptionLink:
              `https://debitllama.com/app/createdPaymentIntents?q=${paymentIntentRow.paymentIntent}`,
          }, customerEmail);
        });
    }
    return;
  }

  // Now I can relay the transaction since the relayer and the account has enough balance and the estimateGas succeeded
  const tx = await relayPayment(
    {
      proof,
      publicSignals,
      payeeAddress: paymentIntentRow.payee_address,
      maxDebitAmount: paymentIntentRow.maxDebitAmount,
      actualDebitedAmount: paymentRequest.requestedAmount,
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
    // The transaction sending fails for some reason, I return and can  try again later!
    await update.DynamicPaymentRequestJobs.unlockById(paymentRequest.id);
    return;
  }
  //Get the relayer balance from the database
  const currentRelayerBalance = getRelayerBalanceForChainId(
    chainId,
    paymentIntentRow.relayerBalance_id,
  );

  await tx.wait().then(async (receipt: any) => {
    if (receipt.status === 1) {
      const fee = receipt.fee;
      const newAccountBalance =
        parseEther(paymentIntentRow.account_id.balance) -
        parseEther(paymentRequest.requestedAmount);

      // I need to use the fee to refund the relayer balance of the excess allocated amount!
      const gasRefund = parseEther(allocatedGas) - fee;

      if (gasRefund < 0) {
        // Then I used more gas than allocated, this should not occur!
      }
      //Update the relayer!
      //and the account balance!
      const newRelayerBalance = parseEther(currentRelayerBalance) + gasRefund;

      await updatePayeeRelayerBalanceSwitchNetwork({
        queryBuilder,
        network: chainId,
        payee_user_id: paymentIntentRow.payee_user_id,
        newRelayerBalance,
        allGasUsed: formatEther(fee),
        paymentIntentRow,
        relayerBalance_id: paymentIntentRow.relayerBalance_id.id,
        submittedTransaction: receipt.hash,
        commitment: paymentIntentRow.commitment,
        newAccountBalance: formatEther(newAccountBalance),
        paymentAmount: paymentRequest.requestedAmount,
      });
      // Set the dynamic payment request job to completed!
      await update.DynamicPaymentRequestJobs.statusToCompletedById(
        paymentRequest.id,
      );

      // Send payment success email to customer
      await doSendMailTo(SendMailReason.BillingStCustomer, {
        billedAmount: `${paymentIntentRow.maxDebitAmount} ${
          JSON.parse(paymentIntentRow.currency).name
        }`,
        subscriptionLink:
          `https://debitllama.com/app/createdPaymentIntents?q=${paymentIntentRow.paymentIntent}`,
      }, customerEmail);

      // send payment success email to payee
      await doSendMailTo(SendMailReason.BillingSTPayee, {
        billedAmount: `${paymentIntentRow.maxDebitAmount} ${
          JSON.parse(paymentIntentRow.currency).name
        }`,
        subscriptionLink:
          `https://debitllama.com/app/payeePaymentIntents?q=${paymentIntentRow.paymentIntent}`,
      }, payeeEmail);
    } else {
      // The transaction failed, should not occur as estimateGas runs before
      // For now nothing happens. Need to handle this edge case later!
    }
  });
}

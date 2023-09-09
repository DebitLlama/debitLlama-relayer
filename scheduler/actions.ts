import QueryBuilder from "../db/queryBuilder.ts";
import { handleCreatedFixedPayments } from "../handlers/handleCreatedFixedPayments.ts";
import { processJobs } from "./process.ts";

/**
 * This will handle the created fixed payments
 * @param queryBuilder
 * @returns
 */
export async function processCreatedFixedPayments(queryBuilder: QueryBuilder) {
  const select = queryBuilder.select();

  const { data: jobs } = await select.PaymentIntents.whereStatusIsCreated();

  if (jobs === null || jobs.length === 0) {
    return;
  }

  await processJobs(
    jobs,
    queryBuilder,
    handleCreatedFixedPayments,
  );
}

/**
 * This process will update the created dynamic requests to locked so I can process them
 * @param queryBuilder
 */

export async function lockDynamicRequests(queryBuilder: QueryBuilder) {
  const update = queryBuilder.update();
  const res = await update.DynamicPaymentRequestJobs
    .whereCreatedOlderThan1Hour();
  console.log(res);
}

export async function processLockedDynamicRequests(queryBuilder: QueryBuilder) {
  const select = queryBuilder.select();
  const {
    data: selectedJobs,
    error: lockedJobsError,
  } = await select.DynamicPaymentRequestJobs.whereStatusIsLocked();
  if (selectedJobs == null || selectedJobs.length === 0) {
    return;
  }

  //Now I need to relay the payment and do like the fixed payment but use the dynamic amount that was added!
  //TODO:
}

export async function processRecurringFixedPricedSubscriptions(
  queryBuilder: QueryBuilder,
) {
  //TODO:
}

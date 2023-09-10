import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import {
  lockDynamicRequests,
  processCreatedFixedPayments,
  processLockedDynamicRequests,
  processRecurringFixedPricedSubscriptions,
} from "../businessLogic/actions.ts";
import QueryBuilder from "../db/queryBuilder.ts";

export function every30MinProcessCreatedFixPayments(
  queryBuilder: QueryBuilder,
) {
  cron("*/30 * * * *", async () => {
    await processCreatedFixedPayments(queryBuilder);
  });
}
export function every2HoursProcessRecurringFixedPricedSubscriptions(
  queryBuilder: QueryBuilder,
) {
  cron("0 */2 * * *", async () => {
    await processRecurringFixedPricedSubscriptions(queryBuilder);
  });
}

export function every30MinLockDynamicRequests(queryBuilder: QueryBuilder) {
  cron("*/30 * * * *", async () => {
    await lockDynamicRequests(queryBuilder);
  });
}

export function every30MinProcessLockedDynamicRequests(
  queryBuilder: QueryBuilder,
) {
  cron("*/30 * * * *", async () => {
    await processLockedDynamicRequests(queryBuilder);
  });
}

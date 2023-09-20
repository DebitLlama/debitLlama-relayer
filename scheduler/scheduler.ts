import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import {
  lockDynamicRequests,
  processCreatedFixedPayments,
  processLockedDynamicRequests,
  processRecurringFixedPricedSubscriptions,
} from "../businessLogic/actions.ts";
import { initializeSupabase } from "../db/client.ts";

export function every30MinProcessCreatedFixPayments() {
  console.log("Initialized every30MinProcessCreatedFixPayments");

  cron("*/30 * * * *", async () => {
    const queryBuilder = initializeSupabase();
    console.log("Running every30MinProcessCreatedFixPayments");
    await processCreatedFixedPayments(queryBuilder);
  });
}
export function every2HoursProcessRecurringFixedPricedSubscriptions() {
  console.log(
    "Initialized every2HoursProcessRecurringFixedPricedSubscriptions",
  );

  cron("0 */2 * * *", async () => {
    const queryBuilder = initializeSupabase();

    console.log("Running every2HoursProcessRecurringFixedPricedSubscriptions");

    await processRecurringFixedPricedSubscriptions(queryBuilder);
  });
}

export function every30MinLockDynamicRequests() {
  console.log("Initialized every30MinLockDynamicRequests");

  cron("*/30 * * * *", async () => {
    console.log("Running every30MinLockDynamicRequests");
    const queryBuilder = initializeSupabase();

    await lockDynamicRequests(queryBuilder);
  });
}

export function every30MinProcessLockedDynamicRequests() {
  console.log("Initialized every30MinProcessLockedDynamicRequests");

  cron("*/30 * * * *", async () => {
    console.log("Running every30MinProcessLockedDynamicRequests");
    const queryBuilder = initializeSupabase();

    await processLockedDynamicRequests(queryBuilder);
  });
}

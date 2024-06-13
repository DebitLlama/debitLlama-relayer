// import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import {
  lockDynamicRequestsFetch,
  processCreatedFixedPayments,
  processLockedDynamicRequests,
  processRecurringFixedPricedSubscriptions,
} from "../businessLogic/actions.ts";

Deno.cron("Process payments", "*/10 * * * *", async () => {
  console.log('CHECKING FOR INTENTS TO SOLVE')
  await processCreatedFixedPayments();
  await processRecurringFixedPricedSubscriptions();
  await lockDynamicRequestsFetch();
  await processLockedDynamicRequests();
});

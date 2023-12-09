// import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import {
  lockDynamicRequestsFetch,
  processCreatedFixedPayments,
  processLockedDynamicRequests,
  processRecurringFixedPricedSubscriptions,
} from "../businessLogic/actions.ts";
import { getRelayerBalances } from "../web3/web3.ts";

Deno.cron("Process payments", "*/10 * * * *", async () => {
  await processCreatedFixedPayments();
  await processRecurringFixedPricedSubscriptions();
  await lockDynamicRequestsFetch();
  await processLockedDynamicRequests();
  await getRelayerBalances();
});

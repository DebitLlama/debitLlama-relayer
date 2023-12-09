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

// Deno.cron("process recurring fixed payments", "*/10 * * * *", async () => {
//   console.log("Running every2HoursProcessRecurringFixedPricedSubscriptions");

//   await processRecurringFixedPricedSubscriptions().then(
//     async () => {
//       await getRelayerBalances();
//     },
//   );

// });

// Deno.cron("Lock dynamic payment requests", "*/10 * * * *", async () => {
//   console.log("Running every30MinLockDynamicRequests");

//   await lockDynamicRequestsFetch().then(
//     async () => {
//       await getRelayerBalances();
//     },
//   );
// });

// Deno.cron("process Locked Dynamic requests", "*/10 * * * *", async () => {
//   console.log("Running every30MinProcessLockedDynamicRequests");
//   await processLockedDynamicRequests().then(
//     async () => {
//       await getRelayerBalances();
//     },
//   );
// });

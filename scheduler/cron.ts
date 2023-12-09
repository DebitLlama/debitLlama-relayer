// import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import {
  lockDynamicRequestsFetch,
  processCreatedFixedPayments,
  processLockedDynamicRequests,
  processRecurringFixedPricedSubscriptions,
} from "../businessLogic/actions.ts";
import { getRelayerBalances } from "../web3/web3.ts";

Deno.cron("Process created fixed payments", "*/30 * * * *", async () => {
  await processCreatedFixedPayments().then(async () => {
    await getRelayerBalances();
  });
});

Deno.cron("process recurring fixed payments", "0 */2 * * *", async () => {
  console.log("Running every2HoursProcessRecurringFixedPricedSubscriptions");
  await processRecurringFixedPricedSubscriptions().then(
    async () => {
      await getRelayerBalances();
    },
  );
});

Deno.cron("Lock dynamic payment requests", "*/30 * * * *", async () => {
  console.log("Running every30MinLockDynamicRequests");
  await lockDynamicRequestsFetch().then(
    async () => {
      await getRelayerBalances();
    },
  );
});

Deno.cron("process Locked Dynamic requests", "*/30 * * * *", async () => {
  console.log("Running every30MinProcessLockedDynamicRequests");
  await processLockedDynamicRequests().then(
    async () => {
      await getRelayerBalances();
    },
  );
});

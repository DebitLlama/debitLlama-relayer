import "$std/dotenv/load.ts";
import {
  processCreatedFixedPayments,
  processRecurringFixedPricedSubscriptions,
} from "../businessLogic/actions.ts";

async function main() {
  console.log("new fixed priced payments processing started");

  await processCreatedFixedPayments();
  console.log("recurring subscriptions processing started");
  await processRecurringFixedPricedSubscriptions();
}

await main();

import "$std/dotenv/load.ts";
import {
  every2HoursProcessRecurringFixedPricedSubscriptions,
  every30MinLockDynamicRequests,
  every30MinProcessCreatedFixPayments,
  every30MinProcessLockedDynamicRequests,
} from "./scheduler/scheduler.ts";
import { getRelayerBalances } from "./web3/web3.ts";

await getRelayerBalances();

function main() {
  every30MinProcessCreatedFixPayments();

  every30MinLockDynamicRequests();

  every30MinProcessLockedDynamicRequests();

  every2HoursProcessRecurringFixedPricedSubscriptions();
}

main();

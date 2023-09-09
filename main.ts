import "$std/dotenv/load.ts";
import { initializeSupabase } from "./db/client.ts";
import {
  every2HoursProcessRecurringFixedPricedSubscriptions,
  every30MinLockDynamicRequests,
  every30MinProcessCreatedFixPayments,
  every30MinProcessLockedDynamicRequests,
} from "./scheduler/scheduler.ts";

function main() {
  const queryBuilder = initializeSupabase();

  every30MinProcessCreatedFixPayments(queryBuilder);

  every30MinLockDynamicRequests(queryBuilder);

  every30MinProcessLockedDynamicRequests(queryBuilder);

  every2HoursProcessRecurringFixedPricedSubscriptions(queryBuilder);
}

main();

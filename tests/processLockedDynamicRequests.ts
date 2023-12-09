import "$std/dotenv/load.ts";

import { processLockedDynamicRequests } from "../businessLogic/actions.ts";

async function main() {
  console.log("processCreatedFixedPayments start");
  await processLockedDynamicRequests();
}

await main();

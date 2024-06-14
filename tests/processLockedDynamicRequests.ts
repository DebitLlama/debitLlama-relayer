import "$std/dotenv/load.ts";

import { processLockedDynamicRequests } from "../actions/actions.ts";

async function main() {
  console.log("processing locked dynamic payment requests");
  await processLockedDynamicRequests();
}

await main();

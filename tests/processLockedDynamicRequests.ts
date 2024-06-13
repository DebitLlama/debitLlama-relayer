import "$std/dotenv/load.ts";

import { processLockedDynamicRequests } from "../businessLogic/actions.ts";

async function main() {
  console.log("processing locked dynamic payment requests");
  await processLockedDynamicRequests();
}

await main();

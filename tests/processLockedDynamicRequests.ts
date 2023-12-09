import "$std/dotenv/load.ts";

import { processLockedDynamicRequests } from "../businessLogic/actions.ts";
import { getRelayerBalances } from "../web3/web3.ts";

async function main() {
  console.log("processCreatedFixedPayments start");
  await getRelayerBalances();

  await processLockedDynamicRequests().then(async () => {
    await getRelayerBalances();
  });
}

await main();

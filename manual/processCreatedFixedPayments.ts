import "$std/dotenv/load.ts";
import { getRelayerBalances } from "../web3/web3.ts";
import { processCreatedFixedPayments } from "../businessLogic/actions.ts";

async function main() {
  console.log("processCreatedFixedPayments start");

  await getRelayerBalances();

  await processCreatedFixedPayments().then(async () => {
    await getRelayerBalances();
  });
}

await main();

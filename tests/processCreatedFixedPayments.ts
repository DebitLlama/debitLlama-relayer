import "$std/dotenv/load.ts";
import { processCreatedFixedPayments } from "../businessLogic/actions.ts";

async function main() {
  console.log("processCreatedFixedPayments start");

  await processCreatedFixedPayments();
}

await main();

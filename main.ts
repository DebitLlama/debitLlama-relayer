import "$std/dotenv/load.ts";
import { initializeSupabase } from "./db/client.ts";
import { newFixedPaymentHandler } from "./eventHandlers/newPayment.ts";

async function main() {
  const { client, channel } = initializeSupabase(
    newFixedPaymentHandler,
    console.log,
  );
}

await main();

import "$std/dotenv/load.ts";

import { createClient } from "@supabase/supabase-js";
import { processLockedDynamicRequests } from "../businessLogic/actions.ts";
import QueryBuilder from "../db/queryBuilder.ts";
import { getRelayerBalances } from "../web3/web3.ts";

async function main() {
  console.log("processCreatedFixedPayments start");

  const client = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_KEY") || "",
    { auth: { persistSession: false } },
  );

  const queryBuilder = new QueryBuilder(client);
  await getRelayerBalances();

  await processLockedDynamicRequests(queryBuilder).then(async () => {
    await getRelayerBalances();
  });
}

await main();

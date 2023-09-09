import "$std/dotenv/load.ts";

import { createClient } from "@supabase/supabase-js";
import { processCreatedFixedPayments } from "../scheduler/actions.ts";

//THIS IS FOR Live tests on the database!

async function liveTest() {
  console.log("test start");

  const client = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_KEY") || "",
    { auth: { persistSession: false } },
  );
}

await liveTest();

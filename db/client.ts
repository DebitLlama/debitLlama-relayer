import { createClient } from "@supabase/supabase-js";
import QueryBuilder from "./queryBuilder.ts";

export function initializeSupabase():QueryBuilder {
  const client = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_KEY") || "",
    { auth: { persistSession: false } },
  );
  const queryBuilder = new QueryBuilder(client);

  return queryBuilder;
}

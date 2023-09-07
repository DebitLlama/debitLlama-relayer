import { createClient } from "@supabase/supabase-js";

export function initializeSupabase(
  newFixedPaymentHandler: CallableFunction,
  dynamicPaymentHandler: CallableFunction,
) {
  const client = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_KEY") || "",
    { auth: { persistSession: false } },
  );

  const channel = client.channel("relayer_1");
  channel.on(
    "broadcast",
    { event: "newFixedPayment" },
    (payload) => newFixedPaymentHandler(client, payload),
  ).subscribe();

  channel.on(
    "broadcast",
    { event: "processDynamicPayment" },
    (payload) => dynamicPaymentHandler(client, payload),
  );

  return { client, channel };
}

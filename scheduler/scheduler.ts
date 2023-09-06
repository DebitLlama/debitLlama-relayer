import { cron } from "https://deno.land/x/deno_cron/cron.ts";

export function every10Min() {
  cron("*/10 * * * *", () => {
    // Every 10 minutes I check the DB for a payment intent I can relay!
  });
}

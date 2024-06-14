import * as log from "https://deno.land/std@0.224.0/log/mod.ts";

export function logInfo(msg: string) {
  log.info(msg);
}

export function logError(msg: string) {
  log.error(msg);
}

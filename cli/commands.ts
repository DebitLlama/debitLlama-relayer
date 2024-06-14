import {
  parseArgs,
  promptSecret,
} from "https://deno.land/std@0.224.0/cli/mod.ts";

import {
  bold,
  cyan,
  green,
  red,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";
import { logError } from "../logger/log.ts";

const app_name = "DebitLlama Intent Solver";
const app_description =
  "Process payment intents into blockchain transactions to debit accounts for subscription payments. Runs every 10 minutes.";
const app_version = Deno.env.get("VERSION") ?? "";
import { getRelayerBalances } from "../web3/web3.ts";

type ARGS = {
  help: boolean;
  dotenv: boolean;
};

const args: ARGS = parseArgs(Deno.args);

if (args.help) {
  printHelpScreen();
  Deno.exit();
}

if (args.dotenv) {
} else {
  const privatekey = promptSecret(
    "Enter an ethereum private key (without 0x prefix):",
  );
  const apikey = promptSecret("Enter your debitllama api key:");

  if (!privatekey) {
    logError("Private key is missing");
    Deno.exit();
  }
  if (!apikey) {
    logError("DebitLlama API key is missing");
    Deno.exit();
  }

  Deno.env.set("RELAYER_PRIVATEKEY", privatekey);
  Deno.env.set("XRELAYER", apikey);
}

await printRelayerBalances();

async function printRelayerBalances() {
  try {
    const relayerBalances = await getRelayerBalances();

    console.log(`Wallet Address: ${relayerBalances.address}`);

    for (let i = 0; i < relayerBalances.balances.length; i++) {
      console.log(
        `${red(relayerBalances.balances[i].name)} : ${
          green(relayerBalances.balances[i].balance)
        } ${green(relayerBalances.balances[i].currency)}`,
      );
    }
  } catch (err) {
    logError("Unable to fetch balances");
    Deno.exit();
  }
}

function printHelpScreen() {
  console.log(
    bold(green(app_name)),
  );
  console.log(app_description);
  console.log(bold(red(app_version)));
  console.log(bold("Available networks:"), cyan("BitTorrent Mainnet"));

  console.log("Flags:");

  console.log("--help           Prints this help text");
  console.log(
    "--dotenv         Use dot env for the secrets. If not present, prompts are used.",
  );
  console.log(
    bold(green(".env file format:")),
  );
  console.log(`
      RELAYER_PRIVATEKEY=   An Ethereum private key without a 0x prefix. ${
    red("Required")
  }.
      XRELAYER=             The API KEY created on Debitllama.com. ${
    red("Required")
  }.
      KVPATH=               Deno.openKV() argument. Database path and name or url. ${
    red("Optional")
  }.
      DENO_KV_ACCESS_TOKEN= If a Deno KV Url is used for KVPATH. the access token is required otherwise leave empty
    `);
}

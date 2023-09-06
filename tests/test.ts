import "$std/dotenv/load.ts";

import { createClient } from "@supabase/supabase-js";
import { newFixedPaymentHandler } from "../eventHandlers/newPayment.ts";
import { getGasPrice, getProvider, getWallet } from "../web3/web3.ts";
import { ChainIds } from "../web3/constants..ts";

async function testnewFixedPayment() {
  const client = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_KEY") || "",
    { auth: { persistSession: false } },
  );

  await newFixedPaymentHandler(client, {
    event: "newFixedPayment",
    payload: {
      paymentIntent:
        "0x0040d71380e4186b8fd72ca7f971bd7788ab58aa0257db76b68d536a80555a8b",
    },
    type: "broadcast",
  });
}

async function testGetGasPrice() {
  const provider = await getProvider(ChainIds.BTT_TESTNET_ID);
  const wallet = await getWallet(provider);
  console.log(await wallet.getAddress());
  //   await getGasPrice(ChainIds.BTT_TESTNET_ID);
}

// await testGetGasPrice();

await testnewFixedPayment();

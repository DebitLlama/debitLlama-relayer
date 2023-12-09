import "$std/dotenv/load.ts";

import "./scheduler/cron.ts";
import { getRelayerBalances } from "./web3/web3.ts";

await getRelayerBalances();

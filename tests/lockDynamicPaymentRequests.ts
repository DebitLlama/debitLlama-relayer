import "$std/dotenv/load.ts";
import { lockDynamicRequestsFetch } from "../actions/actions.ts";

await lockDynamicRequestsFetch();

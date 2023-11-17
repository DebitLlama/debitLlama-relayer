import "$std/dotenv/load.ts";
import { lockDynamicRequestsFetch } from "../businessLogic/actions.ts";

await lockDynamicRequestsFetch();

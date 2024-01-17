import "$std/dotenv/load.ts";
import "./prodenv/configure.ts";

import "./scheduler/cron.ts";
import "./serve/index.ts";

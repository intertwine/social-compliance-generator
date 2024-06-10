import type { TriggerConfig } from "@trigger.dev/sdk/v3";

export const config: TriggerConfig = {
  project: "proj_yjoyprllpcarstivnblt",
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  // dependenciesToBundle: [/@xenova/, "github:xenova/transformers.js#ec16c98cfdf78bb928fe50b2c7669cb7372df4c6"],
};

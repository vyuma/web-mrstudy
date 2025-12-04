import { Mastra } from "@mastra/core/mastra";
import { weatherAgent } from "./agents/weather-agent";

export const mastra = new Mastra({
  agents: {
    weatherAgent,
  },
  telemetry: {
    enabled: false,
  },
  server: {
    port: 4111, // Defaults to 4111
    timeout: 10000, // Defaults to 3 * 60 * 1000 (3 minutes)
  },
});

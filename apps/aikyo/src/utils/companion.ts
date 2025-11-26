import { CompanionServer } from "@aikyo/server";
import type { Companion } from "./types/companion";

export const createCompanionServer = async (
  companion: Companion[],
  timeoutDuration: number = 1000,
) => {
  for (let i = 0; i < companion.length; i++) {
    const server = new CompanionServer(
      companion[i].agent,
      companion[i].history,
      {
        timeoutDuration: timeoutDuration,
      },
    );
    server.start();
  }
};

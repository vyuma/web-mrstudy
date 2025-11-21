import type { CompanionAgent, Message } from "@aikyo/server";

export type Companion = {
  history: Message[];
  agent: CompanionAgent;
};

import { Firehose } from "@aikyo/firehose";
import { speakDataSchema } from "./types/firehose";

export async function createFirehoseServer(port: number = 8080) {
  // Create a new Firehose server
  const firehose = new Firehose(port);
  await firehose.start();

  await firehose.subscribe("queries", (data) => {
    // Validate incoming data
    const speakData = speakDataSchema.parse(data);
    firehose.broadcastToClients(speakData);
  });

  await firehose.subscribe("messages", (data) => {
    firehose.broadcastToClients(data);
  });

  await firehose.subscribe("states", (data) => {
    firehose.broadcastToClients(data);
  });

  return firehose;
}

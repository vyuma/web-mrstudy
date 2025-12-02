import type { Client } from "openapi-fetch";
import createClient from "openapi-fetch";
import * as z from "zod";
import type { paths } from "./types/coeiroinkSchema";
import type { TTS } from "./types/tts";

export const speaker = z.object({
  name: z.string(),
  UUID: z.string().uuid(),
  styles: z
    .object({
      styleName: z.string(),
      styleID: z.number(),
    })
    .array(),
});
export type Speaker = z.infer<typeof speaker>;

export class Coeiroink implements TTS<Speaker> {
  private client: Client<paths, `${string}/${string}`>;
  private speaker: Speaker;

  constructor(options: { apiUrl?: string; speaker: Speaker }) {
    this.client = createClient<paths>({
      baseUrl:
        (options.apiUrl ?? process.env.COEIROINK_API_URL) ||
        "http://127.0.0.1:50032",
    });
    this.speaker = options.speaker;
  }

  async speak(text: string, style: number = 0): Promise<Buffer<ArrayBuffer>> {
    const { data, error } = await this.client.POST("/v1/synthesis", {
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        speakerUuid: this.speaker.UUID,
        styleId: this.speaker.styles[style].styleID,
        text: text,
        speedScale: 1.0,
        volumeScale: 1.0,
        pitchScale: 0.0,
        intonationScale: 1.0,
        prePhonemeLength: 0.1,
        postPhonemeLength: 0.5,
        outputSamplingRate: 24000,
        startTrimBuffer: 0.0,
        endTrimBuffer: 0.0,
        pauseStartTrimBuffer: 0.0,
        pauseEndTrimBuffer: 0.0,
      },
    });

    if (error) {
      console.error(`COEIROINK speak Error: ${error}`);
      throw error;
    }

    if (data) {
      const buffer = Buffer.from(data);
      return buffer;
    }

    throw new Error(
      "Unexpected API response: both data and error are undefined",
    );
  }

  async getSpeakers(): Promise<Speaker[]> {
    const { data, error } = await this.client.GET("/v1/speakers");

    if (error) {
      console.error(`COEIROINK getSpeaker Error: ${error}`);
      throw error;
    }

    if (data) {
      const response = z.array(speaker).safeParse(data);
      if (!response.success) {
        console.error(`COEIROINK getSpeakers Error: ${response.error}`);
        throw response.error;
      }

      return response.data;
    }

    throw new Error(
      "Unexpected API response: both data and error are undefined",
    );
  }

  setSpeaker(speaker: Speaker): void {
    this.speaker = speaker;
  }
}

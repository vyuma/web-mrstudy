import type { Client } from "openapi-fetch";
import createClient from "openapi-fetch";
import type { components, paths } from "./types/openapi/voicevox";
import type { TTS } from "./types/tts";

export type Speaker = components["schemas"]["Speaker"];

export class Voicevox implements TTS<Speaker> {
  private client: Client<paths, `${string}/${string}`>;
  private speaker: Speaker;

  constructor(options: { apiUrl?: string; speaker: Speaker }) {
    this.client = createClient<paths>({
      baseUrl:
        (options.apiUrl ?? process.env.VOICEVOX_API_URL) ||
        "http://127.0.0.1:50021",
    });
    this.speaker = options.speaker;
  }

  async speak(text: string, style: number = 0): Promise<Buffer> {
    // 該当のstyle indexが存在するか確認
    if (style < 0 || style >= this.speaker.styles.length) {
      throw new Error(
        `Invalid style index: ${style}. Available styles: 0-${this.speaker.styles.length - 1}`,
      );
    }

    // クエリの作成
    const { data: queryData, error: queryError } = await this.client.POST(
      "/audio_query",
      {
        params: {
          query: {
            text: text,
            speaker: this.speaker.styles[style].id,
            enable_katakana_english: false,
            core_version: "1.0.0",
          },
        },
      },
    );

    // エラーが発生 / データを受け取れなかった
    if (queryError || !queryData) {
      console.error(`VOICEVOX audio_query Error: ${queryError}`);
      throw queryError ?? new Error("VOICEVOX returned no data");
    }

    // 音声合成
    const { data: synthesisData, error: synthesisError } =
      await this.client.POST("/synthesis", {
        params: {
          query: {
            speaker: this.speaker.styles[style].id,
          },
        },
        body: queryData,
      });

    // エラーが発生 / データを受け取れなかった
    if (synthesisError || !synthesisData) {
      console.error(`VOICEVOX synthesis Error: ${synthesisError}`);
      throw synthesisError ?? new Error("VOICEVOX returned no data");
    }

    const buffer = Buffer.from(synthesisData);
    return buffer;
  }

  async getSpeakers(): Promise<Speaker[]> {
    const { data, error } = await this.client.GET("/speakers");

    if (error || !data) {
      console.error(`VOICEVOX getSpeakers Error: ${error}`);
      throw error ?? new Error("VOICEVOX returned no data");
    }

    return data as Speaker[];
  }

  setSpeaker(speaker: Speaker): void {
    this.speaker = speaker;
  }
}

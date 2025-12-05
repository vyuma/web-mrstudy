"use client";

import { useState, useCallback } from "react";

export type Speaker = {
  speaker_uuid: string;
  name: string;
  styles: { id: number; name: string }[];
  version: string;
};

type CoeiroinkSynthesisResponse = ArrayBuffer;

type CoeiroinkSpeakerResponse = {
  speakerUuid: string;
  speakerName: string;
  styles: { styleId: number; styleName: string }[];
  version: string;
}[];

const COEIROINK_API_URL = "http://127.0.0.1:50032";

export function useCoeiroink() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSpeakers = useCallback(async (): Promise<Speaker[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${COEIROINK_API_URL}/v1/speakers`);

      if (!response.ok) {
        throw new Error(`Failed to fetch speakers: ${response.status}`);
      }

      const data: CoeiroinkSpeakerResponse = await response.json();

      const mapped: Speaker[] = data.map((res) => ({
        speaker_uuid: res.speakerUuid,
        name: res.speakerName,
        styles: res.styles.map((style) => ({
          id: style.styleId,
          name: style.styleName,
        })),
        version: res.version,
      }));

      setSpeakers(mapped);
      return mapped;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch speakers";
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const synthesizeSpeech = useCallback(
    async (
      text: string,
      speakerUuid: string,
      styleId: number
    ): Promise<Blob | null> => {
      try {
        const response = await fetch(`${COEIROINK_API_URL}/v1/synthesis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            speakerUuid,
            styleId,
            text,
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
          }),
        });

        if (!response.ok) {
          throw new Error(`Synthesis failed: ${response.status}`);
        }

        const arrayBuffer: CoeiroinkSynthesisResponse =
          await response.arrayBuffer();
        return new Blob([arrayBuffer], { type: "audio/wav" });
      } catch (err) {
        console.error("TTS synthesis error:", err);
        return null;
      }
    },
    []
  );

  return {
    speakers,
    isLoading,
    error,
    getSpeakers,
    synthesizeSpeech,
  };
}

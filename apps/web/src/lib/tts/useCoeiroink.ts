"use client";

import { useState, useCallback } from "react";
import type { Speaker } from "./coeiroink";

export type { Speaker };

export function useCoeiroink() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSpeakers = useCallback(async (): Promise<Speaker[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/coeiroink/speakers");
      if (!response.ok) {
        throw new Error(`Failed to fetch speakers: ${response.status}`);
      }
      const speakerList: Speaker[] = await response.json();
      setSpeakers(speakerList);
      return speakerList;
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
        const speaker = speakers.find((s) => s.speaker_uuid === speakerUuid);
        if (!speaker) {
          throw new Error(`Speaker not found: ${speakerUuid}`);
        }

        const styleIndex = speaker.styles.findIndex((s) => s.id === styleId);
        if (styleIndex === -1) {
          throw new Error(`Style not found: ${styleId}`);
        }

        const response = await fetch("/api/coeiroink/synthesis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            speaker,
            styleIndex,
          }),
        });

        if (!response.ok) {
          throw new Error(`Synthesis failed: ${response.status}`);
        }

        return await response.blob();
      } catch (err) {
        console.error("TTS synthesis error:", err);
        return null;
      }
    },
    [speakers]
  );

  return {
    speakers,
    isLoading,
    error,
    getSpeakers,
    synthesizeSpeech,
  };
}

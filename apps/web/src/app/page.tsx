"use client";

import { useState, useRef, useCallback } from "react";

const COEIROINK_API_URL = "http://127.0.0.1:50032";

interface Speaker {
  speakerName: string;
  speakerUuid: string;
  styles: {
    styleName: string;
    styleId: number;
  }[];
}

interface AudioQueueItem {
  url: string;
  text: string;
}

// Split text into sentences
function splitIntoSentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[。！？\n])|(?<=[.!?]\s)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If no sentence delimiters found, split by chunks
  if (sentences.length === 1 && text.length > 100) {
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      // Try to find a natural break point (comma, space)
      let breakPoint = 80;
      if (remaining.length > 80) {
        const commaIdx = remaining.lastIndexOf("、", 80);
        const spaceIdx = remaining.lastIndexOf(" ", 80);
        const periodIdx = remaining.lastIndexOf("。", 80);
        breakPoint = Math.max(commaIdx, spaceIdx, periodIdx);
        if (breakPoint < 20) breakPoint = 80;
      } else {
        breakPoint = remaining.length;
      }
      chunks.push(remaining.slice(0, breakPoint + 1).trim());
      remaining = remaining.slice(breakPoint + 1);
    }
    return chunks.filter((c) => c.length > 0);
  }

  return sentences;
}

export default function Home() {
  const [text, setText] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSentence, setCurrentSentence] = useState<string>("");
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSpeakers = async () => {
    try {
      setError(null);
      const response = await fetch(`${COEIROINK_API_URL}/v1/speakers`);
      if (!response.ok) {
        throw new Error("Failed to fetch speakers");
      }
      const data: Speaker[] = await response.json();
      setSpeakers(data);
      if (data.length > 0) {
        setSelectedSpeaker(data[0].speakerUuid);
        if (data[0].styles.length > 0) {
          setSelectedStyle(data[0].styles[0].styleId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error occurred");
    }
  };

  const handleSpeakerChange = (speakerUuid: string) => {
    setSelectedSpeaker(speakerUuid);
    const speaker = speakers.find((s) => s.speakerUuid === speakerUuid);
    if (speaker && speaker.styles.length > 0) {
      setSelectedStyle(speaker.styles[0].styleId);
    }
  };

  // Synthesize a single sentence
  const synthesizeSentence = async (
    sentenceText: string,
    signal?: AbortSignal
  ): Promise<string | null> => {
    try {
      const queryResponse = await fetch(
        `${COEIROINK_API_URL}/v1/estimate_prosody`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sentenceText,
            speakerUuid: selectedSpeaker,
            styleId: selectedStyle,
          }),
          signal,
        }
      );

      if (!queryResponse.ok) return null;
      const prosody = await queryResponse.json();

      const synthesisResponse = await fetch(
        `${COEIROINK_API_URL}/v1/synthesis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speakerUuid: selectedSpeaker,
            styleId: selectedStyle,
            text: sentenceText,
            prosodyDetail: prosody.detail,
            speedScale: 1.0,
            volumeScale: 1.0,
            pitchScale: 0.0,
            intonationScale: 1.0,
            prePhonemeLength: 0.1,
            postPhonemeLength: 0.1,
            outputSamplingRate: 44100,
          }),
          signal,
        }
      );

      if (!synthesisResponse.ok) return null;
      const audioBlob = await synthesisResponse.blob();
      return URL.createObjectURL(audioBlob);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }
      throw err;
    }
  };

  // Play next audio in queue
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setCurrentSentence("");
      return;
    }

    const nextItem = audioQueueRef.current.shift()!;
    setCurrentSentence(nextItem.text);

    if (audioRef.current) {
      audioRef.current.src = nextItem.url;
      audioRef.current.play().catch(() => {
        // If play fails, try next
        URL.revokeObjectURL(nextItem.url);
        playNextInQueue();
      });
    }
  }, []);

  // Handle audio ended
  const handleAudioEnded = useCallback(() => {
    if (audioRef.current?.src) {
      URL.revokeObjectURL(audioRef.current.src);
    }
    playNextInQueue();
  }, [playNextInQueue]);

  // Main streaming synthesis function
  const synthesizeStreaming = async () => {
    if (!text.trim() || selectedStyle === null) {
      setError("Please enter text and select a speaker");
      return;
    }

    // Cancel any ongoing synthesis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Clear queue and stop current playback
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }

    setIsLoading(true);
    setError(null);
    setCurrentSentence("");

    const sentences = splitIntoSentences(text);
    setProgress({ current: 0, total: sentences.length });

    try {
      for (let i = 0; i < sentences.length; i++) {
        if (abortControllerRef.current?.signal.aborted) break;

        const sentence = sentences[i];
        setProgress({ current: i + 1, total: sentences.length });

        const audioUrl = await synthesizeSentence(
          sentence,
          abortControllerRef.current?.signal
        );

        if (audioUrl) {
          audioQueueRef.current.push({ url: audioUrl, text: sentence });

          // Start playback if not already playing
          if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            playNextInQueue();
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Stop playback
  const stopPlayback = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    audioQueueRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.src = "";
      }
    }
    setCurrentSentence("");
    setIsLoading(false);
    setProgress({ current: 0, total: 0 });
  };

  const currentSpeakerData = speakers.find(
    (s) => s.speakerUuid === selectedSpeaker
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          COEIROINK Text-to-Speech
        </h1>

        <div className="mb-6">
          <button
            onClick={fetchSpeakers}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Load Speakers
          </button>
        </div>

        {speakers.length > 0 && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Speaker</label>
              <select
                value={selectedSpeaker}
                onChange={(e) => handleSpeakerChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {speakers.map((speaker) => (
                  <option key={speaker.speakerUuid} value={speaker.speakerUuid}>
                    {speaker.speakerName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Style</label>
              <select
                value={selectedStyle ?? ""}
                onChange={(e) => setSelectedStyle(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currentSpeakerData?.styles.map((style) => (
                  <option key={style.styleId} value={style.styleId}>
                    {style.styleName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Text to Speak
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text here... Long text will be split into sentences for streaming playback."
            rows={6}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={synthesizeStreaming}
            disabled={isLoading || !text.trim() || selectedStyle === null}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isLoading ? "Synthesizing..." : "Synthesize Audio"}
          </button>
          {(isLoading || currentSentence) && (
            <button
              onClick={stopPlayback}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Stop
            </button>
          )}
        </div>

        {/* Progress indicator */}
        {progress.total > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>
                {progress.current} / {progress.total} sentences
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Current sentence display */}
        {currentSentence && (
          <div className="mb-6 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3">
            <div className="text-sm text-gray-400 mb-1">Now playing:</div>
            <div className="text-white">{currentSentence}</div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500 rounded-lg px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        {/* Hidden audio element for playback */}
        <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
      </div>
    </div>
  );
}

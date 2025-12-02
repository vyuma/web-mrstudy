"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [language, setLanguage] = useState("ja-JP");

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    ) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;
    } else {
      setIsSupported(false);
    }
  }, []);

  // Update language when changed
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  // Setup recognition event handlers
  const setupRecognitionHandlers = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else if (event.error === "audio-capture") {
        setError("No microphone found. Please check your microphone.");
      } else if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access.");
      } else {
        setError(`Error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
    };
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Speech recognition not supported");
      return;
    }

    setError(null);
    setupRecognitionHandlers();

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setError("Failed to start speech recognition");
    }
  }, [setupRecognitionHandlers]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not Supported</h1>
          <p className="text-gray-400">
            Speech recognition is not supported in your browser. Please use
            Chrome or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Speech Recognition
        </h1>

        {/* Language selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isListening}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="ja-JP">Japanese</option>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="zh-CN">Chinese (Simplified)</option>
            <option value="ko-KR">Korean</option>
          </select>
        </div>

        {/* Microphone button */}
        <div className="mb-8 flex justify-center">
          <button
            onClick={toggleListening}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isListening ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className="mb-6 text-center">
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              isListening
                ? "bg-red-900/50 text-red-200"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isListening ? "bg-red-400 animate-pulse" : "bg-gray-500"
              }`}
            />
            {isListening ? "Listening..." : "Click to start"}
          </span>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500 rounded-lg px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        {/* Transcript display */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Transcript</label>
          <div className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 min-h-[200px] max-h-[400px] overflow-y-auto">
            {transcript || interimTranscript ? (
              <>
                <span>{transcript}</span>
                {interimTranscript && (
                  <span className="text-gray-400">{interimTranscript}</span>
                )}
              </>
            ) : (
              <span className="text-gray-500">
                Your speech will appear here...
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={copyToClipboard}
            disabled={!transcript}
            className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Copy
          </button>
          <button
            onClick={clearTranscript}
            disabled={!transcript && !interimTranscript}
            className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Link to TTS */}
        <div className="mt-8 text-center">
          <a
            href="/coeiro"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Go to Text-to-Speech (COEIROINK)
          </a>
        </div>
      </div>
    </div>
  );
}

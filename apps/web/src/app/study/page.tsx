"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const COEIROINK_API_URL = "http://127.0.0.1:50032";
const SILENCE_THRESHOLD_MS = 2000; // 5秒間無音で質問を投げる

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

interface Speaker {
  speakerName: string;
  speakerUuid: string;
  styles: {
    styleName: string;
    styleId: number;
  }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

  if (sentences.length === 1 && text.length > 100) {
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
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

export default function StudyPage() {
  // Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  // TTS states
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentence, setCurrentSentence] = useState<string>("");

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [studyContent, setStudyContent] = useState("");
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);

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
      recognitionRef.current.lang = "ja-JP";
    } else {
      setIsSupported(false);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    };
  }, []);

  // Fetch speakers from COEIROINK
  const fetchSpeakers = async () => {
    try {
      setError(null);
      const response = await fetch(`${COEIROINK_API_URL}/v1/speakers`);
      if (!response.ok) {
        throw new Error("COEIROINK に接続できません。起動しているか確認してください。");
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
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // Handle speaker change
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
      setIsSpeaking(false);
      setCurrentSentence("");
      // AI発話終了後、音声認識を再開
      if (isSessionActive && recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started
        }
      }
      return;
    }

    const nextItem = audioQueueRef.current.shift()!;
    setCurrentSentence(nextItem.text);

    if (audioRef.current) {
      audioRef.current.src = nextItem.url;
      audioRef.current.play().catch(() => {
        URL.revokeObjectURL(nextItem.url);
        playNextInQueue();
      });
    }
  }, [isSessionActive, isListening]);

  // Handle audio ended
  const handleAudioEnded = useCallback(() => {
    if (audioRef.current?.src) {
      URL.revokeObjectURL(audioRef.current.src);
    }
    playNextInQueue();
  }, [playNextInQueue]);

  // Speak text using TTS
  const speakText = async (text: string) => {
    if (!text.trim() || selectedStyle === null) return;

    // 音声認識を一時停止
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }

    setIsSpeaking(true);
    setCurrentSentence("");

    const sentences = splitIntoSentences(text);

    try {
      for (const sentence of sentences) {
        if (abortControllerRef.current?.signal.aborted) break;

        const audioUrl = await synthesizeSentence(
          sentence,
          abortControllerRef.current?.signal
        );

        if (audioUrl) {
          audioQueueRef.current.push({ url: audioUrl, text: sentence });

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
    }
  };

  // Send message to AI and get response
  const sendToAI = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    setIsWaitingForAI(true);
    const newUserMessage: ChatMessage = { role: "user", content: userMessage };
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          studyContent: studyContent,
        }),
      });

      if (!response.ok) throw new Error("AI応答の取得に失敗しました");

      const data = await response.json();
      const aiMessage: ChatMessage = { role: "assistant", content: data.message };
      setChatMessages([...updatedMessages, aiMessage]);

      // AIの応答を音声で読み上げ
      await speakText(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsWaitingForAI(false);
    }
  };

  // Check for silence and trigger AI question
  const checkSilence = useCallback(() => {
    const now = Date.now();
    const silenceDuration = now - lastSpeechTimeRef.current;

    if (
      silenceDuration >= SILENCE_THRESHOLD_MS &&
      isSessionActive &&
      !isWaitingForAI &&
      !isSpeaking &&
      transcript.trim()
    ) {
      // 無音が続いたので質問を投げる
      lastSpeechTimeRef.current = now; // リセット

      // 現在の transcript を AI に送信
      const currentTranscript = transcript;
      setTranscript("");
      setInterimTranscript("");

      sendToAI(currentTranscript);
    }
  }, [isSessionActive, isWaitingForAI, isSpeaking, transcript]);

  // Setup silence detection timer
  useEffect(() => {
    if (isSessionActive) {
      silenceTimerRef.current = setInterval(checkSilence, 1000);
    } else {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    return () => {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    };
  }, [isSessionActive, checkSilence]);

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
        lastSpeechTimeRef.current = Date.now(); // 発話時刻を更新
      }
      setInterimTranscript(interim);

      if (interim) {
        lastSpeechTimeRef.current = Date.now();
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`音声認識エラー: ${event.error}`);
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      // セッションがアクティブで、AI発話中でなければ再開
      if (isSessionActive && !isSpeaking && !isWaitingForAI) {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          // Already started or other error
        }
      }
    };

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
      lastSpeechTimeRef.current = Date.now();
    };
  }, [isSessionActive, isSpeaking, isWaitingForAI]);

  // Start study session
  const startSession = useCallback(() => {
    if (!recognitionRef.current) {
      setError("音声認識がサポートされていません");
      return;
    }

    if (selectedStyle === null) {
      setError("スピーカーを選択してください");
      return;
    }

    setError(null);
    setIsSessionActive(true);
    setChatMessages([]);
    setTranscript("");
    setInterimTranscript("");
    lastSpeechTimeRef.current = Date.now();

    setupRecognitionHandlers();

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setError("音声認識の開始に失敗しました");
    }

    // 開始メッセージを送信
    const startMessage = studyContent
      ? `こんにちは！今日は「${studyContent}」について勉強しているんですね。内容を声に出して説明してみてください。わからないところがあれば質問しますね。`
      : "こんにちは！勉強の内容を声に出して説明してみてください。わからないところがあれば質問しますね。";

    const aiMessage: ChatMessage = { role: "assistant", content: startMessage };
    setChatMessages([aiMessage]);
    speakText(startMessage);
  }, [selectedStyle, studyContent, setupRecognitionHandlers]);

  // Stop study session
  const stopSession = useCallback(() => {
    setIsSessionActive(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

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

    setIsSpeaking(false);
    setCurrentSentence("");
  }, []);

  // Manual send button
  const handleManualSend = () => {
    if (transcript.trim()) {
      const currentTranscript = transcript;
      setTranscript("");
      setInterimTranscript("");
      lastSpeechTimeRef.current = Date.now();
      sendToAI(currentTranscript);
    }
  };

  const currentSpeakerData = speakers.find(
    (s) => s.speakerUuid === selectedSpeaker
  );

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">非対応ブラウザ</h1>
          <p className="text-gray-400">
            音声認識はChromeまたはEdgeでご利用ください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          AI勉強サポート
        </h1>

        {/* Setup Section */}
        {!isSessionActive && (
          <div className="mb-8 space-y-6">
            {/* Speaker Setup */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">音声設定</h2>
              <button
                onClick={fetchSpeakers}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
              >
                スピーカーを読み込む
              </button>

              {speakers.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">スピーカー</label>
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
                    <label className="block text-sm font-medium mb-2">スタイル</label>
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
            </div>

            {/* Study Content */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">勉強内容（任意）</h2>
              <input
                type="text"
                value={studyContent}
                onChange={(e) => setStudyContent(e.target.value)}
                placeholder="例: 日本史の江戸時代、三角関数、英語の関係代名詞..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Start Button */}
            <button
              onClick={startSession}
              disabled={selectedStyle === null}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors text-xl"
            >
              勉強セッションを開始
            </button>
          </div>
        )}

        {/* Active Session */}
        {isSessionActive && (
          <div className="space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                    isListening
                      ? "bg-green-900/50 text-green-200"
                      : isSpeaking
                      ? "bg-blue-900/50 text-blue-200"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isListening
                        ? "bg-green-400 animate-pulse"
                        : isSpeaking
                        ? "bg-blue-400 animate-pulse"
                        : "bg-gray-500"
                    }`}
                  />
                  {isListening ? "聞いています..." : isSpeaking ? "話しています..." : "待機中"}
                </span>
                {isWaitingForAI && (
                  <span className="text-yellow-400">AI思考中...</span>
                )}
              </div>
              <button
                onClick={stopSession}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                終了
              </button>
            </div>

            {/* Current Speech Display */}
            {currentSentence && (
              <div className="bg-blue-900/30 border border-blue-500 rounded-lg px-4 py-3">
                <div className="text-sm text-blue-400 mb-1">AI発話中:</div>
                <div className="text-white">{currentSentence}</div>
              </div>
            )}

            {/* Transcript Display */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">あなたの発話</h2>
                <button
                  onClick={handleManualSend}
                  disabled={!transcript.trim() || isWaitingForAI || isSpeaking}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  送信
                </button>
              </div>
              <div className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 min-h-[100px]">
                {transcript || interimTranscript ? (
                  <>
                    <span>{transcript}</span>
                    {interimTranscript && (
                      <span className="text-gray-400">{interimTranscript}</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500">
                    声に出して話してください...
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {SILENCE_THRESHOLD_MS / 1000}秒間無音が続くと自動的にAIに送信されます
              </p>
            </div>

            {/* Chat History */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">会話履歴</h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-gray-700 ml-8"
                        : "bg-blue-900/30 mr-8"
                    }`}
                  >
                    <div className="text-sm text-gray-400 mb-1">
                      {msg.role === "user" ? "あなた" : "AI"}
                    </div>
                    <div className="text-white whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-900/50 border border-red-500 rounded-lg px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        {/* Hidden audio element */}
        <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
      </div>
    </div>
  );
}

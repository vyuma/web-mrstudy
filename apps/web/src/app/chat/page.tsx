"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import VRMChat from "@/components/VRMChat";
import { useSpeechRecognition } from "@/lib/sst";
import BackIcon from "@/components/icon/back";
import { useCoeiroink, type Speaker } from "@/lib/tts/useCoeiroink";

const RESPONSES = {
  greeting: [
    "お疲れさま！今日も頑張ったね！",
    "えらい！集中できたね！",
    "すごいね！私も嬉しいよ！",
  ],
  encouragement: [
    "次も一緒に頑張ろうね！",
    "また会えるの楽しみにしてるね！",
    "いつでも話しかけてね！",
  ],
  question: [
    "どうだった？集中できた？",
    "疲れてない？大丈夫？",
    "休憩も大事だよ！",
  ],
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [_goal, setGoal] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [showSpeakerSelector, setShowSpeakerSelector] = useState(false);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasGreetedRef = useRef(false);

  // クライアントサイドでCOEIROINKに直接アクセス
  const {
    speakers,
    error: speakerError,
    getSpeakers,
    synthesizeSpeech,
  } = useCoeiroink();

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
  } = useSpeechRecognition({
    language: "ja-JP",
    continuous: true,
    interimResults: true,
  });

  // スピーカー一覧を取得
  useEffect(() => {
    const loadSpeakers = async () => {
      setIsLoadingSpeakers(true);
      const speakerList = await getSpeakers();
      if (speakerList.length > 0) {
        setSelectedSpeaker(speakerList[0]);
      }
      setIsLoadingSpeakers(false);
    };

    loadSpeakers();
  }, [getSpeakers]);

  const speakText = useCallback(
    async (text: string) => {
      if (!selectedSpeaker) {
        console.error("Speaker not selected");
        return;
      }

      setIsSpeaking(true);

      try {
        // クライアントから直接COEIROINKを呼び出し
        const styleId = selectedSpeaker.styles[selectedStyleIndex]?.id ?? 0;
        const audioBlob = await synthesizeSpeech(
          text,
          selectedSpeaker.speaker_uuid,
          styleId
        );

        if (!audioBlob) {
          console.error("Failed to get audio data");
          setIsSpeaking(false);
          return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          await audioRef.current.play();
        }
      } catch (error) {
        console.error("TTS Error:", error);
        setIsSpeaking(false);
      }
    },
    [selectedSpeaker, selectedStyleIndex, synthesizeSpeech]
  );

  // ユーザー操作後に挨拶を再生
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedSpeaker) return;
    if (!hasUserInteracted) return;
    if (hasGreetedRef.current) return;

    hasGreetedRef.current = true;

    const savedGoal = sessionStorage.getItem("todayGoal");
    if (savedGoal) {
      setGoal(savedGoal);
    }

    const greetingText = savedGoal
      ? "お疲れさま！今日の目標は「" + savedGoal + "」だったね。頑張ったね！"
      : "お疲れさま！今日も頑張ったね！";

    setMessages([{ role: "assistant", content: greetingText }]);

    setTimeout(() => {
      speakText(greetingText);
    }, 500);
  }, [selectedSpeaker, speakText, hasUserInteracted]);

  // 開始ボタンクリック時の処理
  const handleStart = useCallback(() => {
    setHasUserInteracted(true);
  }, []);

  const handleSend = useCallback(() => {
    const userText = transcript.trim();
    if (!userText) return;

    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    clearTranscript();
    stopListening();

    const responseCategories = Object.values(RESPONSES);
    const randomCategory =
      responseCategories[Math.floor(Math.random() * responseCategories.length)];
    const responseText =
      randomCategory[Math.floor(Math.random() * randomCategory.length)];

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseText },
      ]);
      speakText(responseText);
    }, 500);
  }, [transcript, clearTranscript, stopListening, speakText]);

  const handleBack = () => {
    sessionStorage.removeItem("todayGoal");
    router.push("/home");
  };

  const handleSpeakerChange = (speakerUuid: string) => {
    const speaker = speakers.find((s) => s.speaker_uuid === speakerUuid);
    if (speaker) {
      setSelectedSpeaker(speaker);
      setSelectedStyleIndex(0);
    }
  };

  const handleStyleChange = (styleIndex: number) => {
    setSelectedStyleIndex(styleIndex);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <VRMChat isSpeaking={isSpeaking} />
      </div>

      {/* 開始オーバーレイ - ユーザー操作前に表示 */}
      {!hasUserInteracted && !isLoadingSpeakers && selectedSpeaker && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-amber-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-amber-600 transition transform hover:scale-105 active:scale-95"
          >
            タップして開始
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition"
          >
            <BackIcon />
          </button>

          {/* スピーカー選択ボタン */}
          <button
            onClick={() => setShowSpeakerSelector(!showSpeakerSelector)}
            disabled={isLoadingSpeakers || !!speakerError}
            className="p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition disabled:opacity-50"
            title="音声を選択"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>

          {selectedSpeaker && (
            <span className="text-sm bg-white/80 px-3 py-1 rounded-full shadow">
              {selectedSpeaker.name}
              {selectedSpeaker.styles.length > 1 &&
                ` - ${selectedSpeaker.styles[selectedStyleIndex]?.name}`}
            </span>
          )}
        </div>

        {/* スピーカー選択パネル */}
        {showSpeakerSelector && (
          <div className="mx-4 p-4 bg-white/95 rounded-2xl shadow-lg space-y-3">
            <h3 className="font-bold text-gray-800">音声を選択</h3>

            {speakerError && (
              <p className="text-red-500 text-sm">{speakerError}</p>
            )}

            {isLoadingSpeakers ? (
              <p className="text-gray-500">読み込み中...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-600">
                    キャラクター
                  </label>
                  <select
                    value={selectedSpeaker?.speaker_uuid ?? ""}
                    onChange={(e) => handleSpeakerChange(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    {speakers.map((speaker) => (
                      <option
                        key={speaker.speaker_uuid}
                        value={speaker.speaker_uuid}
                      >
                        {speaker.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSpeaker && selectedSpeaker.styles.length > 1 && (
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-600">
                      スタイル
                    </label>
                    <select
                      value={selectedStyleIndex}
                      onChange={(e) =>
                        handleStyleChange(Number(e.target.value))
                      }
                      className="w-full p-2 border rounded-lg bg-white"
                    >
                      {selectedSpeaker.styles.map((style, index) => (
                        <option key={style.id} value={index}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => setShowSpeakerSelector(false)}
                  className="w-full p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                >
                  閉じる
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        <div className="p-4 space-y-4">
          <div className="max-h-48 overflow-y-auto space-y-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-2xl max-w-[80%] ${
                  msg.role === "assistant"
                    ? "bg-amber-100/90 text-amber-900 self-start"
                    : "bg-white/90 text-gray-800 self-end ml-auto"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {(transcript || interimTranscript) && (
            <div className="bg-white/90 p-3 rounded-2xl text-gray-800">
              {transcript}
              <span className="text-gray-400">{interimTranscript}</span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-white/90 p-3 rounded-2xl shadow-lg">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!isSupported || isSpeaking || !selectedSpeaker}
              className={`p-4 rounded-full transition ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              } ${(!isSupported || isSpeaking || !selectedSpeaker) && "opacity-50 cursor-not-allowed"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>

            <div className="flex-1 text-gray-600 text-sm">
              {isLoadingSpeakers
                ? "音声エンジン初期化中..."
                : speakerError
                  ? "COEIROINKに接続できません"
                  : !selectedSpeaker
                    ? "スピーカーを選択してください"
                    : isListening
                      ? "話しかけてね..."
                      : isSpeaking
                        ? "話し中..."
                        : "マイクボタンを押して話しかけてね"}
            </div>

            <button
              onClick={handleSend}
              disabled={!transcript.trim() || isSpeaking || !selectedSpeaker}
              className={`p-3 rounded-full bg-amber-500 text-white transition ${
                !transcript.trim() || isSpeaking || !selectedSpeaker
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-amber-600"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>

          {!isSupported && (
            <p className="text-center text-red-500 text-sm bg-white/80 p-2 rounded-lg">
              お使いのブラウザは音声認識に対応していません
            </p>
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

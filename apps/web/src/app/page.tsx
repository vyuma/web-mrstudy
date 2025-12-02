"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8">MRStudy</h1>
        <p className="text-gray-400 mb-12">
          AI音声サポートで効率的に勉強しよう
        </p>

        <div className="space-y-4">
          <Link
            href="/study"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-xl"
          >
            AI勉強サポートを開始
          </Link>

          <div className="flex gap-4">
            <Link
              href="/voice"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              音声認識（STT）
            </Link>
            <Link
              href="/coeiro"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              音声合成（TTS）
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

# CLAUDE.md - web-mrstudy/apps/web

## プロジェクト概要

学習支援Webアプリケーション。VRMモデルを使った3Dアバター、音声合成(TTS)、音声認識(SST)機能を備えたポモドーロタイマーアプリ。

## モノレポ構成

```
web-mrstudy/
├── apps/
│   ├── web/          # Next.js フロントエンド（このディレクトリ）
│   └── aikyo/        # Aikyoコンパニオンサーバー（Anthropic AI連携）
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 4
- **3Dレンダリング**: Three.js + @pixiv/three-vrm
- **音声合成(TTS)**: COEIROINK / VOICEVOX
- **音声認識(SST)**: Web Speech API
- **テスト**: Vitest
- **リンター/フォーマッター**: Biome
- **パッケージマネージャー**: pnpm

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router ページ
│   ├── page.tsx           # ルートページ
│   ├── layout.tsx         # ルートレイアウト
│   ├── home/              # ホーム画面
│   ├── timer/             # ポモドーロタイマー画面
│   ├── coeiro/            # COEIROINK関連ページ
│   └── api/               # APIルート
├── components/            # Reactコンポーネント
│   ├── VRMViewer.tsx     # 3D VRMアバター表示
│   ├── chat/             # チャット関連コンポーネント
│   ├── icon/             # アイコンコンポーネント
│   ├── goal.tsx          # 目標設定
│   ├── timer.tsx         # タイマーコンポーネント
│   └── navigation_buttun.tsx  # ナビゲーションボタン
├── lib/                   # ライブラリ・ユーティリティ
│   ├── sst/              # 音声認識(Speech-to-Text)
│   │   ├── index.ts      # エクスポート
│   │   ├── hooks.ts      # React hooks
│   │   ├── speech.ts     # SpeechRecognitionClient
│   │   └── types/        # 型定義
│   └── tts/              # 音声合成(Text-to-Speech)
│       ├── coeiroink.ts  # COEIROINKクライアント
│       ├── voicevox.ts   # VOICEVOXクライアント
│       └── types/        # 型定義
public/
├── models/               # 3Dモデル（VRM）
├── images/               # 画像アセット
└── videos/               # 動画アセット
```

## 主要コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番サーバー起動
pnpm start

# リント
pnpm lint

# フォーマット
pnpm format

# テスト
pnpm test
pnpm test:watch
pnpm test:coverage
```

## 環境変数

`.env.example`を参考に`.env`を作成:

```
COEIROINK_API_URL=http://127.0.0.1:50032
VOICEVOX_API_URL=http://127.0.0.1:50021
```

## 主要機能

### VRMアバター (VRMViewer.tsx)
- Three.jsで3Dアバターをレンダリング
- 口パクアニメーション（あ・い・う・え・お）
- 瞬きアニメーション
- 腕のポーズ制御

### 音声認識 (lib/sst)
- Web Speech APIをラップしたカスタムフック
- `useSpeechRecognition`フックで簡単に利用可能

### 音声合成 (lib/tts)
- COEIROINK / VOICEVOXのAPIクライアント
- OpenAPI型定義を使用した型安全な実装

## コーディング規約

- Biomeでリント・フォーマット（`biome.json`参照）
- React 19 + React Compiler使用
- "use client"ディレクティブはクライアントコンポーネントのみ

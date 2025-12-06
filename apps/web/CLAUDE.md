# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Next.js web application for MR Study, part of a pnpm monorepo (web-mrstudy). The application integrates with text-to-speech (TTS) engines and is designed to work with the Mastra-based backend located at `apps/backend/`.

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code with Biome
pnpm lint

# Format code with Biome
pnpm format

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Environment Setup

- **Node.js**: >= 20 required
- **Package Manager**: pnpm 10.22.0
- **Framework**: Next.js 16.0.3 with React 19.2.0
- **Module System**: ES Modules
- Environment variables:
  - `VOICEVOX_API_URL`: VOICEVOX TTS API endpoint (default: http://127.0.0.1:50021)
  - `COEIROINK_API_URL`: COEIROINK TTS API endpoint (default: http://127.0.0.1:50032)

## Architecture

### Next.js App Router Structure

The application uses Next.js App Router (`src/app/`) with:

- **`src/app/page.tsx`**: Home page component
- **`src/app/layout.tsx`**: Root layout with Geist font families
- **`src/app/globals.css`**: Global Tailwind CSS styles

### TTS Library (`src/lib/tts/`)

The application provides a unified interface for multiple Japanese TTS engines:

- **`types/tts.ts`**: Generic `TTS<S>` interface that all TTS engines implement
  - `speak(text: string): Promise<Buffer>`: Synthesize speech and return audio buffer
  - `getSpeakers(): Promise<S[]>`: Get available speakers
  - `setSpeaker(speaker: S): void`: Set the active speaker

- **`voicevox.ts`**: VOICEVOX TTS engine implementation
  - Uses OpenAPI-generated types for type-safe API calls
  - Two-step synthesis: `/audio_query` → `/synthesis`
  - Supports multiple speakers and styles per speaker

- **`coeiroink.ts`**: COEIROINK TTS engine implementation
  - Uses OpenAPI-generated types for type-safe API calls
  - Single-step synthesis: `/v1/synthesis`
  - Supports multiple speakers and styles per speaker
  - Provides detailed control over synthesis parameters (speed, pitch, intonation, etc.)

Both TTS implementations:
- Use `openapi-fetch` with generated types from `types/openapi/`
- Accept `apiUrl` in constructor or fall back to environment variables
- Require speaker to be set before calling `speak()`
- Support style selection via index parameter in `speak(text, style)`

### OpenAPI Integration

The project uses `openapi-typescript` to generate TypeScript types from OpenAPI specs:
- Generated types are in `src/lib/tts/types/openapi/`
- Provides full type safety for TTS API requests and responses
- Types are referenced via `paths` and `components` imports

### Path Aliases

TypeScript is configured with `@/*` path alias mapping to `./src/*` (tsconfig.json:22)

## Code Style

- **Formatter**: Biome with 2-space indentation
- **Linter**: Biome with recommended rules + Next.js and React domain rules
- **Import Organization**: Auto-organized via Biome assist
- Files in `node_modules/`, `.next/`, `dist/`, `build/` are ignored

## Key Configuration Files

- `next.config.ts`: Next.js configuration with React Compiler enabled
- `biome.json`: Biome formatter and linter configuration
- `tsconfig.json`: TypeScript configuration with strict mode and path aliases
- `postcss.config.mjs`: PostCSS configuration for Tailwind CSS v4
- `package.json`: Dependencies and scripts

## Testing

- **Test Framework**: Vitest 4.0.15
- Tests can be run with `pnpm test`, `pnpm test:watch`, or `pnpm test:coverage`
- No test files exist yet in the codebase

## Monorepo Context

This web app is located at `apps/web/` in the web-mrstudy monorepo:
- Monorepo uses pnpm workspaces (see `pnpm-workspace.yaml` at root)
- Shares dependencies via root `pnpm-lock.yaml`
- Sibling backend application at `apps/backend/` uses Mastra framework
- The backend provides AI agents (like "Alice") that the web app can interact with

## Patterns

### Adding a New TTS Engine

1. Create implementation file in `src/lib/tts/[engine].ts`
2. Implement the `TTS<S>` interface from `types/tts.ts`
3. Generate OpenAPI types using `openapi-typescript` if the engine has an OpenAPI spec
4. Store generated types in `src/lib/tts/types/openapi/[engine].d.ts`
5. Use `openapi-fetch` with `createClient<paths>()` for type-safe API calls

### Working with TTS Engines

```typescript
import { Voicevox } from "@/lib/tts/voicevox";

const tts = new Voicevox({ apiUrl: "http://localhost:50021" });
const speakers = await tts.getSpeakers();
tts.setSpeaker(speakers[0]);
const audioBuffer = await tts.speak("こんにちは", 0); // style index 0
```

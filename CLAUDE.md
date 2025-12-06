# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is **web-mrstudy**, a monorepo for the MR Study web application. The project consists of:
- **Backend** (`apps/backend/`): Mastra-based AI agent framework with study assistant agents
- **Web** (`apps/web/`): Next.js 16 web application with TTS integration

## Monorepo Structure

```
web-mrstudy/
├── apps/
│   ├── backend/      # Mastra AI agent backend
│   └── web/          # Next.js web frontend
├── pnpm-workspace.yaml
└── flake.nix         # Nix development environment
```

## Development Environment

**Package Manager**: pnpm 10.22.0 (workspace-based monorepo)
**Node.js**: 22.x (provided by Nix flake)
**Nix Development Shell**: Includes pnpm, Node.js 22, and VOICEVOX engine

### Starting Development

```bash
# Enter Nix development shell (if using Nix)
nix develop

# Install dependencies (from monorepo root)
pnpm install

# Start backend development server
cd apps/backend
pnpm dev

# Start web development server (in separate terminal)
cd apps/web
pnpm dev
```

## Common Commands

### From Monorepo Root
```bash
# Install all workspace dependencies
pnpm install

# Run command in specific workspace
pnpm --filter backend dev
pnpm --filter web dev
```

### Backend (apps/backend/)
```bash
pnpm dev        # Start Mastra dev server with hot reload
pnpm build      # Build for production
pnpm start      # Start production server
npx biome check --write .  # Lint and format
```

### Web (apps/web/)
```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Lint with Biome
pnpm format           # Format with Biome
pnpm test             # Run Vitest tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
```

## Architecture Overview

### Backend Architecture

The backend uses **Mastra**, an AI agent framework. Key components:

- **Mastra Instance** (`apps/backend/src/mastra/index.ts`): Central configuration that registers all agents, workflows, tools, and scorers
- **Agents** (`apps/backend/src/mastra/agents/`): AI agents like "Alice" study assistant
  - Use Google Gemini 2.5 Flash Lite model
  - Have persistent memory stored in SQLite (`mastra.db`)
- **Tools** (`apps/backend/src/mastra/tools/`): Reusable functions agents can invoke
  - Defined with Zod schemas for type safety
- **Workflows** (`apps/backend/src/mastra/workflows/`): Multi-step workflows connecting agents and tools
- **Storage**: LibSQLStore for agent memory (`:memory:` default, can use file-based)

### Web Architecture

The web app is a **Next.js 16** application with App Router:

- **TTS Integration** (`apps/web/src/lib/tts/`): Unified interface for Japanese TTS engines
  - Supports VOICEVOX and COEIROINK
  - Type-safe API calls using `openapi-fetch` with generated types
  - Generic `TTS<S>` interface for consistent API across engines
- **OpenAPI Type Generation**: Uses `openapi-typescript` for type-safe TTS API calls
- **UI**: React 19 with Tailwind CSS v4
- **Testing**: Vitest 4.x

## Key Patterns

### Working Across Workspaces

When making changes that affect both apps:
1. Backend API changes often require corresponding frontend updates
2. TTS integration in web app is separate from AI agent functionality in backend
3. Both apps share the same pnpm lockfile at root

### Adding Features

**Backend Agent**: See `apps/backend/CLAUDE.md` for detailed agent/tool/workflow patterns

**Frontend TTS Engine**: See `apps/web/CLAUDE.md` for TTS engine implementation patterns

### Dependency Management

- Install workspace dependencies from root: `pnpm add <package> --filter <workspace>`
- Example: `pnpm add zod --filter backend`
- Shared dependencies are hoisted to root `node_modules/`

## Code Style

Both apps use **Biome** for linting and formatting:
- Backend: Tab indentation, double quotes
- Web: 2-space indentation
- Both: Auto-organized imports

## Environment Variables

**Backend** (`apps/backend/.env`):
- `GOOGLE_GENERATIVE_AI_API_KEY`: Required for Gemini model

**Web** (`apps/web/.env` or `.env.local`):
- `VOICEVOX_API_URL`: Default http://127.0.0.1:50021
- `COEIROINK_API_URL`: Default http://127.0.0.1:50032

## Workspace-Specific Documentation

For detailed information about each workspace:
- Backend: `apps/backend/CLAUDE.md`
- Web: `apps/web/CLAUDE.md`
- タスクを開始したらAva MCPでタスクを開始してください。
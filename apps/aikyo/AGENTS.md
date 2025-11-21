# Repository Guidelines

## Project Structure & Module Organization
`src/index.ts` bootstraps the companion and firehose servers. Agent personas live in `src/cards/` and should encapsulate prompts, tools, and seeded history per companion. Shared runtime helpers sit in `src/utils/`, with transport logic in `companion.ts` and `firehose.ts` plus type definitions under `src/utils/types/`. Use `src/tools/` for future automation glue. Local SQLite state in `db/` aids development only; avoid expanding this directory in commits.

## Build, Test, and Development Commands
Install dependencies with `pnpm install`. `pnpm run dev` executes `tsx src/index.ts` for the default server loop, while `pnpm run dev:debug` adds verbose libp2p logging via `DEBUG=libp2p:*`. Replace the placeholder `pnpm test` script with your runner but keep the command name stable for CI.

## Coding Style & Naming Conventions
Stick to TypeScript with ES modules and prefer named exports. Follow the existing two-space indentation, trailing commas on multi-line literals, and `camelCase` for functions and variables. Use `PascalCase` only for agent constants or classes. Group imports by external packages before relative paths, and update `pnpm` scripts if you add automatic formatters or linters.

## Testing Guidelines
Introduce Vitest or an equivalent lightweight harness when tests arrive. Store specs beside the subject file using `.test.ts` or under `src/**/__tests__`. Focus coverage on server bootstrapping, card configuration, and utility helpers; stub network layers to keep runs deterministic. Once ready, wire `pnpm test` to the suite and document any extra flags such as `--watch`.

## Commit & Pull Request Guidelines
With no history yet, adopt Conventional Commit prefixes such as `feat:` or `chore:`. Keep commits scoped to a single behavioral change and include database migrations or seed updates alongside their companion changes. Pull requests should outline the intent, manual verification steps, and any affected companion IDs. Attach logs or screenshots whenever agent output or connection behavior changes.

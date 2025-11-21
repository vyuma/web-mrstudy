# Aikyo Companion Template

This is the most lightweight aikyo starter kit template.

## Quick Start

- Ensure you have Node.js 22+ and `pnpm` installed.
- Install dependencies:
  ```bash
  pnpm install
  ```
- Provide an Anthropic API key (needed by the bundled companions):
  ```bash
  echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
  ```
- Launch the development servers:
  - `pnpm run dev` starts the companion loop (`tsx src/index.ts`).
  - `pnpm run dev:debug` runs the same loop with `DEBUG=libp2p:*` for verbose networking logs.
  - Example Request: `cat example_request.json | jq -cM . | websocat ws://localhost:8080`

The default entry point boots two companions (`kyoko` and `aya`) and the Firehose server on port `8080`.

## Project Layout

- `src/index.ts` – boots the companion and Firehose servers.
- `src/cards/` – agent personas encapsulating prompts, tools, and seeded history.
- `src/utils/` – runtime helpers, including server factories and shared Zod schemas under `src/utils/types/`.
- `src/tools/` – directory for placing aikyo's Tools (Knowledge, Action).

## Development Notes

- Logging: enable `DEBUG=libp2p:*` (via `pnpm run dev:debug`) for detailed peer-to-peer traces.
- Configuration: supply any additional environment variables required by your tools or knowledge modules before starting the server.

## License

[MIT](./LICENSE)

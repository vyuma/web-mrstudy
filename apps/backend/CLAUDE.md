# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a backend application built with Mastra, an AI agent framework. The application is part of a monorepo (web-mrstudy) and uses pnpm workspaces. It currently implements an AI-powered study assistant agent named "Alice" that helps users with their learning.

## Development Commands

```bash
# Start development server with hot reload
pnpm dev

# Build the application
pnpm build

# Start production server
pnpm start

# Lint and format code with Biome
npx biome check --write .
```

## Environment Setup

- **Node.js**: >= 22.13.0 required
- **Package Manager**: pnpm 10.22.0
- **Module System**: ES Modules (type: "module")
- Environment variables are stored in `.env` (see `.env` for required keys like `GOOGLE_GENERATIVE_AI_API_KEY`)

## Architecture

### Mastra Framework Structure

The codebase follows Mastra's opinionated structure under `src/mastra/`:

- **`index.ts`**: Main Mastra instance configuration
  - Registers all agents, workflows, scorers, tools
  - Configures storage (LibSQLStore), logging (PinoLogger), and observability
  - Uses in-memory storage by default (`:memory:`), can be changed to file-based

- **`agents/`**: AI agent definitions
  - Each agent is a separate file (e.g., `alice.ts`)
  - Agents have instructions, model configurations, tools, and memory
  - Currently uses `google/gemini-2.5-flash-lite` model
  - Agent memory persists to `file:../mastra.db` (relative to `.mastra/output`)

- **`tools/`**: Reusable tools that agents can invoke
  - Tools define input/output schemas using Zod
  - Example: `weather-tool.ts` fetches weather data via Open-Meteo API
  - Tools are attached to agents in agent definitions

- **`workflows/`**: Multi-step workflows using Mastra's workflow system
  - Created with `createWorkflow()` and `createStep()`
  - Steps define input/output schemas and execute functions
  - Can access agents via the `mastra` context
  - Example: `study.ts` implements a 3-step dialogue workflow:
    1. `analyze-next-action`: Determines Alice's next action based on user message
    2. `generate-response`: Generates personality-driven response with emotion/confidence
    3. `extract-learning`: Extracts learned concepts and conversation metadata

- **`scorers/`**: Evaluation scorers for testing agent outputs (currently not implemented)

### Code Style

- **Formatter**: Biome with tab indentation
- **Quotes**: Double quotes for JavaScript/TypeScript
- **Imports**: Auto-organized via Biome assist
- Files in `.mastra/` and `node_modules/` are ignored

## Key Files

- `src/mastra/index.ts`: Central Mastra configuration - register new agents/workflows here
- `src/mastra/agents/alice.ts`: Main study assistant agent with Japanese personality
- `biome.json`: Formatter and linter configuration
- `tsconfig.json`: TypeScript compiler options (ES2022, bundler moduleResolution)

## Patterns

### Adding a New Agent

1. Create agent file in `src/mastra/agents/[name].ts`
2. Define agent with instructions, model, tools, and memory
3. Export the agent and register it in `src/mastra/index.ts`

Example:
```typescript
export const myAgent = new Agent({
  name: "MyAgent",
  instructions: "...",
  model: "google/gemini-2.5-flash-lite",
  tools: { myTool },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:../mastra.db" }),
  }),
});
```

### Adding a New Tool

1. Create tool file in `src/mastra/tools/[name]-tool.ts`
2. Use `createTool()` with id, description, schemas, and execute function
3. Attach tool to agents in their definitions

Example:
```typescript
export const myTool = createTool({
  id: "my-tool",
  description: "What this tool does",
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  execute: async ({ context }) => {
    // Tool implementation
    return { ... };
  },
});
```

### Adding a New Workflow

1. Create workflow file in `src/mastra/workflows/[name].ts`
2. Define steps with `createStep()` and compose with `createWorkflow()`
3. Use `.map()` to transform data between steps
4. Register workflow in `src/mastra/index.ts`

Example:
```typescript
const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  execute: async ({ mastra, inputData }) => {
    const agent = mastra.getAgent("AgentName");
    // Step logic
    return { ... };
  },
});

export const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
})
  .then(step1)
  .map(async ({ getInitData, getStepResult }) => {
    // Transform data between steps
    const input = getInitData();
    const step1Result = getStepResult("step-1");
    return { ...transformedData };
  })
  .then(step2)
  .commit();
```

### Using Structured Output with Agents

When you need an agent to return structured data instead of free-form text:

```typescript
const response = await agent.generate(prompt, {
  structuredOutput: {
    schema: yourZodSchema,
  },
});

if (!response.object) {
  throw new Error("Failed to generate structured output");
}

return response.object; // Typed according to your schema
```

## Monorepo Context

This backend is located at `apps/backend/` in the web-mrstudy monorepo. The monorepo uses:
- pnpm workspaces (see `pnpm-workspace.yaml` at root)
- Nix flake for development environment
- Shared `pnpm-lock.yaml` at monorepo root

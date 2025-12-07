# backend
## development

```bash
pnpm i
cd apps/backend && cp .env.example .env
pnpm run --filter backend dev
```

## production

```bash
pnpm i
cd apps/backend && cp .env.example .env
pnpm run --filter backend build
pnpm run --filter backend start
```

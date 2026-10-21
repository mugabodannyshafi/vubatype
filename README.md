# vubatype

pnpm workspace for the VubaType typing app. The Next.js frontend and NestJS API stay independently buildable.

```text
vubatype/
├── apps/
│   ├── web/          # vubatype-ui, Next.js
│   └── api/          # vubatype-be, NestJS
├── packages/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── turbo.json
```

## Requirements

- Node.js 20.9 or newer. CI uses Node.js 22 LTS.
- pnpm 12.14.0. The root `packageManager` field pins this version. Enable it with Corepack (`corepack enable`) or install it directly.

## Setup

From the repository root:

```bash
pnpm install
```

The API reads `apps/api/.env` from its own directory. Copy `apps/api/.env.example` when that file is missing. Do not commit `.env` or `.env.testing`.

## Development

```bash
pnpm dev
```

That starts both applications:

- Web on http://localhost:3000. Its `/api` rewrite targets `http://127.0.0.1:3001` unless `API_URL` is already set.
- API on port 3001. `start:dev` is unchanged and still listens on `PORT` or 3000, which is what Docker Compose uses inside the container.

Run one app:

```bash
pnpm --filter vubatype-ui dev
pnpm --filter vubatype-be dev
```

## Checks

```bash
pnpm build
pnpm lint
pnpm test
pnpm --filter vubatype-be test:e2e
pnpm format
```

`pnpm test` runs the API unit tests. The web package has no test script. End-to-end tests boot the API and its database, so do not run them against a database you need to keep unchanged. `DB_SYNCHRONIZE` defaults to true and seeders run when the API process starts.

## Docker

Compose lives with the API and builds from the repository root:

```bash
docker compose -f apps/api/docker-compose.yml up
```

The container still runs `start:dev` and listens on port 3000. The host port comes from `APP_PORT`.

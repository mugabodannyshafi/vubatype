# VubaType

VubaType is an open-source typing practice and competitive racing project focused on Rwanda and beyond. People can practice in Kinyarwanda or English and, as the racing work lands, compete with others.

The repository is a pnpm and Turborepo monorepo. The Next.js frontend and the NestJS API build independently.

## Status

Solo practice works in the web app. A guest can start a session, type a passage, and review the result.

Multiplayer racing is still in development. The API has early room endpoints, and the home page shows a race preview. The web app does not yet let someone create a room or join a live race. Public matchmaking is not open.

The API also has register and login endpoints. The web app does not yet include an account flow.

## Stack

- [pnpm](https://pnpm.io) workspaces and [Turborepo](https://turbo.build)
- [Next.js](https://nextjs.org) and React in `apps/web` (`vubatype-ui`)
- [NestJS](https://nestjs.com), TypeORM, and PostgreSQL in `apps/api` (`vubatype-be`)
- TypeScript, ESLint, and Prettier for the API

`packages/` is reserved for shared code. It is empty aside from a placeholder file.

## Layout

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

## Getting started

Requirements:

- Node.js 20.9 or newer. CI uses Node.js 22.
- pnpm 12.14.0, pinned by the root `packageManager` field. Enable it with Corepack (`corepack enable`) or install that version directly.

From the repository root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

That starts both applications:

- Web on http://localhost:3000. The dev script sets `API_URL` to `http://127.0.0.1:3001` unless `API_URL` is already set. `/api` is rewritten to that origin.
- API `dev` on port 3001.

Run one app:

```bash
pnpm --filter vubatype-ui dev
pnpm --filter vubatype-be dev
```

`pnpm --filter vubatype-be start:dev` listens on `PORT` or 3000. Docker Compose uses that command inside the container. When `API_URL` is unset, the Next.js rewrite falls back to `http://127.0.0.1:3000`.

## Environment

The API reads `apps/api/.env` from its own directory. Start from `apps/api/.env.example`. End-to-end tests can use `apps/api/.env.testing`, copied from `apps/api/.env.testing.example`.

Do not commit `.env` or `.env.testing`. Replace placeholder secrets before sharing an environment.

## Development commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm format
pnpm --filter vubatype-be test:e2e
```

`pnpm test` runs the API unit tests. The web package has no test script. `pnpm lint` checks both apps and does not rewrite files. `pnpm format` writes Prettier formatting for the API. `pnpm build` produces production builds and checks TypeScript.

End-to-end tests boot the API and its database. Do not run them against a database you need to keep unchanged. `DB_SYNCHRONIZE` defaults to true, and seeders run when the API process starts. CI does not run those tests.

## Docker

Compose lives with the API and builds from the repository root:

```bash
docker compose -f apps/api/docker-compose.yml up
```

The container runs `start:dev` and listens on port 3000. The host port comes from `APP_PORT`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch names, checks, and pull requests.

## Code of Conduct

This project uses the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Security

Report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## License

VubaType is released under the [MIT License](LICENSE).

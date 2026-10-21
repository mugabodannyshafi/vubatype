# Contributing to VubaType

Thanks for helping with VubaType. This guide covers the setup and review practices used in this repository.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- Report a bug with the bug report form.
- Suggest a feature with the feature request form.
- Open a pull request for a focused change.
- Improve documentation.

Look for the labels `good first issue` and `help wanted` when they are present. Those labels are not created by files in this repository. A maintainer has to add them in GitHub. See [Repository settings](#repository-settings).

Security vulnerabilities are reported privately. See [SECURITY.md](SECURITY.md). Do not file a public issue for a vulnerability.

## Fork and clone

1. Fork [github.com/mugabodannyshafi/vubatype](https://github.com/mugabodannyshafi/vubatype).
2. Clone your fork and add the original repository as `upstream`:

```bash
git clone git@github.com:YOUR_USERNAME/vubatype.git
cd vubatype
git remote add upstream git@github.com:mugabodannyshafi/vubatype.git
```

The default branch is `main`. There is no `development` branch yet. Open pull requests against `main` unless a maintainer asks for another base.

## Prerequisites

- Node.js 20.9 or newer. GitHub Actions uses Node.js 22.
- pnpm 12.14.0. The root `packageManager` field pins this version. Enable it with Corepack:

```bash
corepack enable
corepack prepare pnpm@12.14.0 --activate
```

- PostgreSQL when you want to run the API against a database. Docker Compose can provide it. Unit tests do not need a database.

## Local setup

From the repository root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
```

The API reads `apps/api/.env`. Replace placeholder secrets in that file before you share an environment. Do not commit `.env` or `.env.testing`.

End-to-end tests read `apps/api/.env.testing` when you create it from `apps/api/.env.testing.example`. They are not part of pull-request CI.

## Run the applications

Start both apps:

```bash
pnpm dev
```

- Web (`vubatype-ui`) listens on http://localhost:3000. The dev script sets `API_URL` to `http://127.0.0.1:3001` unless you already set it. Requests to `/api` are rewritten to that origin.
- API (`vubatype-be`) `dev` listens on port 3001.

Run one app:

```bash
pnpm --filter vubatype-ui dev
pnpm --filter vubatype-be dev
```

`pnpm --filter vubatype-be start:dev` still listens on `PORT` or 3000. That is the command Docker Compose uses inside the container. If `API_URL` is unset, the Next.js config falls back to `http://127.0.0.1:3000`.

Docker Compose for the API, from the repository root:

```bash
docker compose -f apps/api/docker-compose.yml up
```

The container runs `start:dev` on port 3000. The host port comes from `APP_PORT`.

## Repository layout

```text
vubatype/
├── apps/
│   ├── web/          # vubatype-ui, Next.js
│   └── api/          # vubatype-be, NestJS
├── packages/         # reserved for shared packages
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── turbo.json
```

`packages/` does not contain shared code yet.

## Branch names

Use a short branch name with one of these prefixes:

- `feat/` for a new behavior
- `fix/` for a bug fix
- `docs/` for documentation
- `refactor/` for a behavior-preserving change
- `test/` for tests
- `chore/` for tooling or maintenance

Example: `fix/practice-finish-grace`.

## Commit messages

Write an imperative sentence, in the style already used in this repository:

```text
Add guest nickname updates to the practice header.
```

Say what changed and why in the body when the subject is not enough. Do not commit secrets or local environment files.

## Coding standards

- TypeScript for both applications.
- The API formats with Prettier. Config is in `apps/api/.prettierrc`. `pnpm format` writes those files.
- API lint uses ESLint with `eslint-plugin-prettier`. It checks formatting and does not rewrite files.
- The web app uses `eslint-config-next`. It does not have a Prettier script.
- `.editorconfig` sets UTF-8, LF, and two-space indentation. Quote style is left to each app: the API uses single quotes, and the web app uses double quotes.
- Keep a pull request limited to one change. A reviewer should be able to understand it in one sitting.

## Checks

From the repository root:

```bash
pnpm lint
pnpm test
pnpm build
pnpm format
```

| Command | What it does |
| --- | --- |
| `pnpm lint` | Lints the API and the web app. It does not apply fixes. |
| `pnpm test` | Runs API unit tests. The web package has no test script. |
| `pnpm build` | Production builds for both apps. These builds also check TypeScript. |
| `pnpm format` | Writes Prettier formatting for the API. |
| `pnpm --filter vubatype-be test:e2e` | Boots the API and its database. |

Do not run end-to-end tests against a database you need to keep. `DB_SYNCHRONIZE` defaults to true, and seeders run when the API process starts. Pull-request CI does not run end-to-end tests, seeders, or migrations.

CI jobs are `api`, `web`, and `dependencies`. CodeQL reports a separate check named `Analyze (javascript-typescript)`. Fork pull requests are validated without repository secrets.

The dependencies job runs `pnpm audit --audit-level=high`. Two advisories with no patched release are listed under `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`: `braces` (`GHSA-vfj7-8cjw-p6xm`, high) from ESLint and Jest, and `sprintf-js` (`GHSA-hp3w-g68c-fv3c`, moderate). Remove an entry when a patched version exists.

## Pull requests

1. Create a branch from the latest `main`.
2. Make the change and run the checks that cover it.
3. Push the branch to your fork.
4. Open a pull request against `main`.
5. Fill in the pull request template, including a link to the related issue when there is one.
6. Add screenshots for a user-interface change.

A maintainer will review the pull request. Reviews should be specific, kind, and limited to the change. Ask for clarification instead of assuming intent. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Please respond to review comments with a code change or a short explanation. Keep later commits on the same branch.

## Repository settings

These GitHub settings are not turned on by files in the repository, and they were not verified as enabled:

- **Private vulnerability reporting**, under Settings → Code security and analysis. [SECURITY.md](SECURITY.md) depends on it.
- **Dependabot security updates**, in addition to the version updates configured in `.github/dependabot.yml`. Version updates open against the default branch, which is `main`.
- **Branch protection** on `main`, and on `development` if that branch is created later:
  - Require a pull request before merging.
  - Do not allow force pushes.
  - Require the checks `api`, `web`, `dependencies`, and `Analyze (javascript-typescript)`.
- **Labels**, if they are missing: `good first issue`, `help wanted`, `bug`, `enhancement`, and `documentation`.
- **Code owner reviews**, after `.github/CODEOWNERS` is on the default branch. This is optional.

Coverage upload is not part of CI. If it is added later, it must not be a required check for pull requests from forks, because those workflows do not receive repository secrets.

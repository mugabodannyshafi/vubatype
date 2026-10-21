# vubatype-be

This package is `vubatype-be` in the vubatype pnpm workspace (`apps/api`). From the repository root, install with `pnpm install`. `pnpm --filter vubatype-be dev` listens on port 3001. `pnpm --filter vubatype-be start:dev` still listens on `PORT` or 3000.

A NestJS application

## Installation

```bash
pnpm install
```

## Running the app

### With Docker

```bash
# From the repository root
docker compose -f apps/api/docker-compose.yml up
```

### Without Docker

```bash
# development on port 3001
pnpm --filter vubatype-be dev

# watch mode on PORT or 3000
pnpm --filter vubatype-be start:dev

# production mode
pnpm --filter vubatype-be start:prod
```

## Test

```bash
# unit tests
pnpm --filter vubatype-be test

# e2e tests
pnpm --filter vubatype-be test:e2e

# test coverage
pnpm --filter vubatype-be test:cov
```

## CI/CD

This project includes GitHub Actions workflows for:
- Automated testing on push and pull requests
- Code quality checks (linting, formatting)
- Test coverage reporting

---
Generated with nestify 

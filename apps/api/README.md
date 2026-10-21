# vubatype-be

A NestJS application

## Installation

```bash
npm install
```

## Running the app

### With Docker

```bash
# Start with docker-compose
docker-compose up

# Start in detached mode
docker-compose up -d

```

### Without Docker

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## CI/CD

This project includes GitHub Actions workflows for:
- Automated testing on push and pull requests
- Code quality checks (linting, formatting)
- Test coverage reporting

---
Generated with nestify 

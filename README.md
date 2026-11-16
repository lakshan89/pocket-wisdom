# pocket-wisdom

A small NestJS API that serves random quotes from Postgres. It exists to practise containerised deployments to AWS (EC2, then ECS Fargate) through GitHub Actions.

## Requirements

- Node 24 (`nvm use` reads `.nvmrc`)

## Run locally

```bash
npm ci
npm run start:dev
```

## Scripts

| Script | What it does |
|---|---|
| `npm run build` | Compiles to `dist/` |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit tests (Vitest) |
| `npm run test:e2e` | Runs end-to-end tests |

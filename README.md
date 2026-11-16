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

| Script             | What it does             |
| ------------------ | ------------------------ |
| `npm run build`    | Compiles to `dist/`      |
| `npm run lint`     | Runs ESLint              |
| `npm test`         | Runs unit tests (Vitest) |
| `npm run test:e2e` | Runs end-to-end tests    |

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org). A `commit-msg` hook runs commitlint and rejects anything else, because the release pipeline reads the messages to pick the next version:

- `fix: ...` bumps the patch version
- `feat: ...` bumps the minor version
- `feat!: ...` or a `BREAKING CHANGE:` footer bumps the major version
- `chore:`, `docs:`, `test:`, `refactor:`, `ci:` don't trigger a release

The `pre-commit` hook runs ESLint and Prettier on staged files.

# pocket-wisdom

A small NestJS API that serves random quotes from Postgres. It exists to practise containerised deployments to AWS (EC2, then ECS Fargate) through GitHub Actions.

## Requirements

- Node 24 (`nvm use` reads `.nvmrc`)

## Run locally

```bash
npm ci
npm run start:dev
```

Copy `.env.example` to `.env` first. Every setting is an environment variable, validated at startup by [src/config/env.schema.ts](src/config/env.schema.ts).

## Database

Postgres 17. The app reads its connection string from `DATABASE_URL`.

```bash
npm run build
npm run migrate   # apply pending migrations
npm run seed      # load the bundled quotes (safe to rerun)
```

In a container, run the compiled scripts directly: `node dist/database/migrate.js`, then `node dist/database/seed.js`. Both exit with code 1 on failure.

For RDS, require TLS and verify the server certificate by adding `?sslmode=verify-full&sslrootcert=/path/to/global-bundle.pem` to `DATABASE_URL`. The bundle comes from https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem.

### Changing the schema

TypeORM never alters the schema on its own (`synchronize` is off). To change it:

1. Edit the entity in `src/quotes/entities/`.
2. With a migrated local database running, generate a migration:
   ```bash
   npm run migration:generate -- src/database/migrations/AddSomething
   ```
3. Review the SQL, then import the new class in `src/database/migrations/index.ts` and append it to the array.
4. `npm run test:e2e` checks that the migration applies and reverts cleanly, and that no entity change is missing a migration.

`npm run migrate:revert` rolls back the latest migration.

## API conventions

- Routes are versioned in the URL: `/v1/...`.
- Swagger UI is at `/docs` and the OpenAPI JSON at `/docs-json`. Set `DOCS_ENABLED=false` to turn them off.
- Errors use [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details (`application/problem+json`). Validation failures list each bad field under `errors`.
- Every response has an `x-request-id` header. Send your own to trace a request through the logs.
- Each client IP gets `RATE_LIMIT_PER_MINUTE` requests per minute, then `429`.

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

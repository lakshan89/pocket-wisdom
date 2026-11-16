# pocket-wisdom

A small NestJS API that serves random quotes from Postgres. It exists to practise containerised deployments to AWS (EC2, then ECS Fargate) through GitHub Actions.

Deploying to AWS is covered step by step in [docs/infra-guide.md](docs/infra-guide.md).

## Requirements

- Node 24 (`nvm use` reads `.nvmrc`)
- Docker, for the local database and the e2e tests

## Run locally

```bash
cp .env.example .env
docker compose up -d db       # Postgres 17 on localhost:5432
npm ci
npm run build && npm run migrate && npm run seed
npm run start:dev
```

Every setting is an environment variable, validated at startup by [src/config/env.schema.ts](src/config/env.schema.ts).

If something else already uses port 5432, set `POSTGRES_PORT=5433` in `.env` and change the port in `DATABASE_URL` to match. Compose reads `.env` when it substitutes `${POSTGRES_PORT}`.

### Run the whole stack in Docker

```bash
docker compose up -d --build
docker compose exec api node dist/database/migrate.js
docker compose exec api node dist/database/seed.js
curl localhost:3000/v1/quotes/random
```

The `api` container runs the production image with `NODE_ENV=production` and reaches the database at host `db`. Stop it (`docker compose stop api`) before running `npm run start:dev`, because both use port 3000. `docker compose down` keeps the data. `docker compose down -v` deletes it.

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

## Endpoints

Full request and response schemas are in Swagger UI at `/docs`.

| Endpoint                                          | Returns                                            |
| ------------------------------------------------- | -------------------------------------------------- |
| `GET /v1/quotes/random?author=&category=`         | One random quote. `404` if nothing matches         |
| `GET /v1/quotes?author=&category=&limit=&offset=` | A page of quotes                                   |
| `GET /v1/quotes/:id`                              | One quote                                          |
| `GET /v1/authors?limit=&offset=`                  | A page of authors, sorted by name                  |
| `GET /v1/authors/:slug`                           | One author                                         |
| `GET /v1/authors/:slug/quotes?limit=&offset=`     | A page of that author's quotes                     |
| `GET /v1/categories`                              | Every category, sorted by name                     |
| `GET /v1/categories/:slug/quotes?limit=&offset=`  | A page of quotes in that category                  |
| `GET /health`                                     | Liveness, with the running version and environment |
| `GET /health/ready`                               | Readiness, including a database ping               |

Lists return `{ data, meta: { total, limit, offset } }`. `limit` defaults to 20 and is capped at 50. `author` and `category` take slugs such as `seneca` or `stoicism`.

## API conventions

- Routes are versioned in the URL: `/v1/...`.
- Swagger UI is at `/docs` and the OpenAPI JSON at `/docs-json`. Set `DOCS_ENABLED=false` to turn them off.
- Errors use [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details (`application/problem+json`). Validation failures list each bad field under `errors`.
- Every response has an `x-request-id` header. Send your own to trace a request through the logs.
- Each client IP gets `RATE_LIMIT_PER_MINUTE` requests per minute, then `429`.

## Scripts

| Script                             | What it does                                                                |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `npm run start:dev`                | Runs the app with reload on change                                          |
| `npm run build`                    | Compiles to `dist/`                                                         |
| `npm run lint`                     | Runs ESLint                                                                 |
| `npm run typecheck`                | Type-checks without emitting                                                |
| `npm test`                         | Runs unit tests                                                             |
| `npm run test:e2e`                 | Runs end-to-end tests against a throwaway Postgres container (needs Docker) |
| `npm run test:cov`                 | Runs both and writes `coverage/lcov.info` for SonarQube (needs Docker)      |
| `npm run migrate` / `npm run seed` | Applies migrations / loads seed quotes (after `build`)                      |

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org). A `commit-msg` hook runs commitlint and rejects anything else, because the release pipeline reads the messages to pick the next version:

- `fix: ...` bumps the patch version
- `feat: ...` bumps the minor version
- `feat!: ...` or a `BREAKING CHANGE:` footer bumps the major version
- `chore:`, `docs:`, `test:`, `refactor:`, `ci:` don't trigger a release

The `pre-commit` hook runs ESLint and Prettier on staged files.

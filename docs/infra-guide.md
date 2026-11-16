# Infrastructure guide

This guide takes pocket-wisdom from "runs on my laptop" to "merging to `main` deploys to dev, and the same image is promoted to QA and prod". Work through it in order. Each step builds on the one before.

Every step follows the same pattern:

1. Create a feature branch.
2. Build what the step describes.
3. Run the "Done when" checks.
4. Open a PR into `main` and merge it.

The steps describe what to build and give the snippets that are easy to get wrong. Writing the files yourself is the point of the exercise.

## Progress

- [ ] 1. Local Postgres with Docker Compose
- [ ] 2. Dockerfile
- [ ] 3. PR CI workflow
- [ ] 4. SonarQube Cloud
- [ ] 5. Auth module
- [ ] 6. AWS account prep
- [ ] 7. Terraform foundation (VPC, ECR, GitHub OIDC)
- [ ] 8. Push an image to ECR by hand
- [ ] 9. Terraform dev environment (RDS, SSM, EC2, ALB)
- [ ] 10. Deploy to dev by hand
- [ ] 11. Release workflow (tag, build, deploy dev)
- [ ] 12. QA and prod with approval gates
- [ ] 13. Move to ECS Fargate
- [ ] 14. Domain and HTTPS

## How the finished system fits together

```
 feature branch ──PR──> main
                         │
                         ▼
             GitHub Actions: release workflow
   tag v1.4.0 ─> build image once ─> push to ECR (digest sha256:abc...)
                         │
                         ▼
   deploy dev  (automatic)              ─┐
   deploy qa   (waits for your approval) ├─ same image digest, no rebuild
   deploy prod (waits for your approval) ─┘
                         │
   each deploy:  migrate ─> seed ─> roll out app ─> smoke test /health
```

In AWS, each environment (dev, qa, prod) has:

- An ALB (load balancer) that receives HTTP traffic and forwards it to the app.
- The app container: on EC2 in phase 1, on ECS Fargate in phase 2.
- An RDS Postgres database in private subnets that only the app can reach.
- Its settings and secrets in SSM Parameter Store under `/pocket-wisdom/<env>/`.

All three environments share one VPC and one ECR repository.

## What it costs

Steps 1 to 8 are free, apart from a few cents of ECR storage. From step 9 on you pay while resources exist. Approximate monthly costs in `us-east-1`, per environment that stays up all month:

| Resource                                                      | Monthly cost                 |
| ------------------------------------------------------------- | ---------------------------- |
| ALB                                                           | about $16-20                 |
| EC2 t3.small                                                  | about $15                    |
| RDS db.t4g.micro (free tier: 750 hours a month for 12 months) | about $12-15 after free tier |
| Public IPv4 addresses ($0.005 an hour each)                   | about $4 each                |

Three environments running all month cost around $100. You won't run them all month: run `terraform destroy` when you finish a session and `terraform apply` when you start the next one. Step 6 sets up a budget alarm so a forgotten resource can't surprise you.

---

## Step 1: Local Postgres with Docker Compose

**Goal.** `npm run start:dev` works against a local Postgres.

**You'll learn.** Compose services, named volumes, healthchecks, and how the app finds its database through `DATABASE_URL`.

**Do this.**

```bash
nvm use                         # Node 24, from .nvmrc
git checkout main && git pull
git checkout -b feature/docker-compose
cp .env.example .env
```

Create `docker-compose.yml` in the repo root with one service, `db`:

- Image `postgres:17-alpine`, the version the tests use.
- Environment `POSTGRES_USER=pocket`, `POSTGRES_PASSWORD=pocket`, `POSTGRES_DB=pocket_wisdom`, to match `DATABASE_URL` in `.env`.
- Port `5432:5432`.
- A named volume mounted at `/var/lib/postgresql/data`.
- A `healthcheck` that runs `pg_isready -U pocket -d pocket_wisdom`, every 5 seconds.

Then:

```bash
docker compose up -d
docker compose ps                         # db should show "healthy"
npm run build && npm run migrate && npm run seed
npm run start:dev
```

**Done when.**

- `curl localhost:3000/v1/quotes/random` returns a quote.
- `curl localhost:3000/health/ready` reports `"database":{"status":"up"}`.
- After `docker compose down` and `docker compose up -d`, the quotes are still there. (`docker compose down -v` deletes the volume, so don't use `-v` here.)

**Common mistakes.**

- `Config validation error: DATABASE_URL` means there's no `.env` file. Copy it from `.env.example`.
- `Node.js v20` in an error means nvm is on the wrong version. Run `nvm use`.
- `port is already allocated` means another Postgres is on 5432. Stop it, or publish `5433:5432` and change the port in `.env`.

---

## Step 2: Dockerfile

**Goal.** One image that runs in every environment, configured only through environment variables.

**You'll learn.** Multi-stage builds, small images, running as a non-root user, build arguments, and why config must stay out of the image.

**Do this.** Branch `feature/dockerfile`. Create `.dockerignore` and `Dockerfile`.

`.dockerignore` keeps the build context small and secrets out of the image. List at least `node_modules`, `dist`, `coverage`, `.git`, `.env`, `.env.*` and `*.log`.

`Dockerfile`, in stages:

1. **`deps`** from `node:24-alpine`. Copy `package.json` and `package-lock.json` only, then `npm ci --ignore-scripts`. Copying the lockfile before the source means Docker reuses this layer until dependencies change.
2. **`build`** from `deps`. Copy the source, then `npm run build`.
3. **`prod-deps`** from `node:24-alpine`. Copy both package files, then `npm ci --omit=dev --ignore-scripts`. `--ignore-scripts` matters because the `prepare` script runs `husky`, a dev dependency that isn't installed here.
4. **`runtime`** from `node:24-alpine`:
   - `ENV NODE_ENV=production`
   - `ARG APP_VERSION=local` followed by `ENV APP_VERSION=$APP_VERSION`. The release pipeline passes the version tag as a build argument, so `/health` shows which build is running.
   - Download the RDS certificate bundle so the app can verify the database's TLS certificate:
     ```dockerfile
     ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/rds/global-bundle.pem
     ```
   - Copy `dist/` from `build`, `node_modules/` from `prod-deps`, and `package.json`.
   - `USER node`. The official image already has this unprivileged user.
   - `EXPOSE 3000`
   - A `HEALTHCHECK` that calls `http://localhost:3000/health`. Alpine has no curl, but busybox `wget -qO- ...` works.
   - `CMD ["node", "dist/main.js"]`. Don't use `npm start` here: npm doesn't pass SIGTERM on to Node, so the app wouldn't shut down cleanly during deploys.

Add an `api` service to `docker-compose.yml`:

- `build: .`
- `env_file: .env`, then override `DATABASE_URL` to use host `db` in place of `localhost`. Inside the compose network, the service name is the hostname.
- `depends_on: db` with `condition: service_healthy`.
- Port `3000:3000`.

**Done when.**

```bash
docker build --build-arg APP_VERSION=v0.0.0-test -t pocket-wisdom:local .
docker images pocket-wisdom:local          # aim for under 250 MB
docker compose up -d --build
docker compose run --rm api node dist/database/migrate.js
docker compose run --rm api node dist/database/seed.js
curl localhost:3000/health                 # "version":"v0.0.0-test"
docker compose exec api whoami             # node, not root
```

The last three commands are the same ones the deploy pipeline will run in AWS: migrate, then seed, then start the app.

**Common mistakes.**

- `sh: husky: not found` during the build means `--ignore-scripts` is missing.
- `ECONNREFUSED 127.0.0.1:5432` from the `api` container means `DATABASE_URL` still says `localhost`. Inside a container, `localhost` is the container itself.
- `Cannot find module` at startup usually means `dist/` was copied to the wrong path. The entrypoint is `dist/main.js`.

---

## Step 3: PR CI workflow

**Goal.** Every PR runs lint, typecheck, tests and build, and `main` can't be merged into while any of them fail.

**You'll learn.** GitHub Actions workflows, jobs, caching, and branch protection.

**Do this.** Branch `ci/pr-checks`. Create `.github/workflows/ci.yml`:

- Trigger: `pull_request` on `main`.
- Permissions: `contents: read` only.
- One job, `checks`, on `ubuntu-latest`:
  1. `actions/checkout` with `fetch-depth: 0`, because commitlint needs the PR's history.
  2. `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`.
  3. `npm ci`
  4. Commitlint over the PR's commits:
     ```bash
     npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
     ```
  5. `npm run lint`, `npm run format:check`, `npm run typecheck`
  6. `npm run test:cov`. GitHub's Ubuntu runners have Docker, so the Testcontainers tests work there.
  7. `npm run build`
  8. `docker build .`, to catch a broken Dockerfile before merge.
- Upload `coverage/lcov.info` as an artifact with `actions/upload-artifact`, so you can download it from the run.

Then protect `main`: on GitHub, go to **Settings > Rules > Rulesets > New branch ruleset**:

- Target: the default branch.
- Require a pull request before merging.
- Require status checks to pass: add `checks`. It only shows up in the list after the workflow has run once, so open the PR first.
- Block force pushes.

**Done when.**

- The PR shows a green `checks` run.
- A test branch with a bad commit message such as `wip` fails the commitlint step.
- GitHub won't let you merge a PR while `checks` is red.

**Common mistakes.**

- Commitlint fails with `fatal: bad object` when checkout used the default `fetch-depth: 1`.
- A workflow file on a feature branch runs on that branch's PRs, so you can test it before it reaches `main`.

---

## Step 4: SonarQube Cloud

**Goal.** Every PR gets a quality gate result (bugs, code smells, duplication, coverage on new code) next to the CI checks.

**You'll learn.** Static analysis in CI, coverage import, and quality gates.

**Do this.**

1. Sign in at https://sonarcloud.io with GitHub. Import the `pocket-wisdom` repository (free for public repos).
2. In the project, go to **Administration > Analysis Method** and turn **Automatic Analysis** off. CI analysis and automatic analysis can't both run, and only CI analysis can import coverage.
3. Create a token (**My Account > Security**) and add it to the GitHub repo as the secret `SONAR_TOKEN`.
4. Branch `ci/sonarqube`. Add `sonar-project.properties`:
   ```properties
   sonar.organization=<your-sonar-org>
   sonar.projectKey=<your-project-key>
   sonar.sources=src
   sonar.tests=src,test
   sonar.test.inclusions=**/*.spec.ts,**/*.e2e-spec.ts
   sonar.exclusions=src/database/migrations/**,src/database/seed/seed-data.ts
   sonar.javascript.lcov.reportPaths=coverage/lcov.info
   ```
   Migrations are generated code and the seed file is data, so they're excluded from analysis.
5. In `ci.yml`, after `npm run test:cov`, add the official `SonarSource/sonarqube-scan-action` (use its current major version) with `SONAR_TOKEN` in `env`.
6. Add the Sonar check to the ruleset's required status checks.

**Done when.** The PR shows a SonarQube quality gate check and comment, and coverage reads about 90%.

**Common mistakes.**

- Coverage shows 0% when `test:cov` didn't run before the scan, or the `lcov.info` path is wrong.
- `You are running CI analysis while Automatic Analysis is enabled` means step 2 was skipped.

---

## Step 5: Auth module

**Goal.** Clients log in and get a JWT. Read routes stay public, and new write routes for quotes need a valid token.

**You'll learn.** Password hashing, signing and verifying JWTs, global guards, and route metadata.

This is your own learning step, so this section only sets the boundaries:

- Read https://docs.nestjs.com/security/authentication.md first. `AGENTS.md` notes that Nest 12 has a first-party `@nestjs/authentication` package.
- Add a `users` entity, then generate its migration with `npm run migration:generate` (see the README).
- Hash passwords with argon2 or bcrypt. Never store or log the plain password.
- Add `JWT_SECRET` (at least 32 characters) and `JWT_EXPIRES_IN` to `src/config/env.schema.ts`. Locally they live in `.env`; in AWS they'll go in SSM in step 9.
- Register the guard globally with `APP_GUARD`, and let it skip any route marked `@Public()` (see `src/common/decorators/public.decorator.ts`).
- Add `POST /v1/quotes`, `PATCH /v1/quotes/:id` and `DELETE /v1/quotes/:id` behind the guard, with Zod body schemas.
- Swagger already declares bearer auth (`addBearerAuth()` in `src/app.setup.ts`). Put `@ApiBearerAuth()` on the guarded routes, and the **Authorize** button in `/docs` will send your token.

**Done when.**

- `POST /v1/quotes` without a token returns 401 as problem+json.
- After logging in, the same request with `Authorization: Bearer <token>` returns 201.
- The `Authorization` header shows as `[Redacted]` in the logs (already configured).
- e2e tests cover login, a rejected request and an accepted request.

---

## Step 6: AWS account prep

**Goal.** A safe AWS account, the CLI signed in, Terraform installed, and an S3 bucket for Terraform state.

**You'll learn.** Root user safety, budgets, CLI credentials, and why Terraform state lives in S3.

**Do this.**

1. **Lock down the root user.** Turn on MFA for the root user, then stop using it day to day.
2. **Create an admin login for yourself.** Use IAM Identity Center with a user that has `AdministratorAccess`, or an IAM user if you prefer. Turn on MFA.
3. **Add a budget alarm.** In **Billing > Budgets**, create a $10 monthly cost budget that emails you at 80% and 100% of actual spend.
4. **Sign in from the CLI.**
   ```bash
   aws login
   aws sts get-caller-identity         # should show your admin user, not root
   ```
5. **Pick one region** and use it everywhere, for example `us-east-1` or the one closest to you.
6. **Install Terraform.**
   ```bash
   brew tap hashicorp/tap && brew install hashicorp/tap/terraform
   terraform -version                  # 1.10 or newer, for S3 native locking
   ```
7. **Create the state bucket by hand.** This is the one resource Terraform can't create for itself, because Terraform needs the bucket before it can store state. Use a globally unique name such as `pocket-wisdom-tfstate-<your-account-id>`. Turn on versioning, so you can recover a damaged state file. Keep "Block all public access" on.

**Done when.** `aws sts get-caller-identity` works without root, the budget exists, and the bucket has versioning on.

---

## Step 7: Terraform foundation

**Goal.** The shared pieces every environment uses: a VPC, an ECR repository, and a role GitHub Actions can assume without stored AWS keys.

**You'll learn.** Terraform structure, remote state, VPC basics, ECR, and OIDC federation.

**Layout.** Branch `infra/foundation`. One way to lay out `infra/`:

```
infra/
  foundation/          # shared, applied once
    main.tf  vpc.tf  ecr.tf  github-oidc.tf  outputs.tf  versions.tf
  env/                 # one copy per environment, chosen by -var-file
    main.tf  ...  dev.tfvars  qa.tfvars  prod.tfvars
```

Keep `foundation` and `env` as separate Terraform roots with separate state files. Then destroying dev can never touch the VPC or ECR.

**Backend.** In `versions.tf`, pin the AWS provider's major version and store state in S3 with native locking:

```hcl
terraform {
  required_version = ">= 1.10"
  backend "s3" {
    bucket       = "pocket-wisdom-tfstate-<account-id>"
    key          = "foundation/terraform.tfstate"
    region       = "<your-region>"
    use_lockfile = true   # S3 native locking, no DynamoDB table needed
    encrypt      = true
  }
}
```

**VPC.**

- One VPC, for example `10.0.0.0/16`, across 2 availability zones. ALBs and RDS subnet groups both need at least 2.
- 2 public subnets with an internet gateway and a route `0.0.0.0/0` to it.
- 2 private subnets with no route to the internet. RDS goes here.
- No NAT gateway. It costs about $32 a month, and nothing here needs one, because the app runs in the public subnets (see the note below).

The well-known `terraform-aws-modules/vpc/aws` module does all of this in about 15 lines. Writing the raw resources once (`aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_route_table`) teaches more. Either is fine.

> **Why the app runs in public subnets.** Production systems usually put the app in private subnets and pay for a NAT gateway or VPC endpoints so it can still pull images. Here the app gets a public IP so it can reach ECR, SSM and CloudWatch for free, and its security group only accepts traffic from the ALB. That keeps it unreachable from the internet. The database stays private.

**ECR.**

- `aws_ecr_repository` named `pocket-wisdom`.
- `image_tag_mutability = "IMMUTABLE"`, so a version tag can never point to a different image. Promotion relies on that.
- `scan_on_push = true`.
- `aws_ecr_lifecycle_policy` that expires untagged images after 7 days and keeps only the last 30 `sha-` tags.

**GitHub OIDC.** This lets a workflow assume an AWS role with short-lived credentials, so there are no AWS keys stored in GitHub.

- `aws_iam_openid_connect_provider` with URL `https://token.actions.githubusercontent.com` and client ID `sts.amazonaws.com`.
- A role `pocket-wisdom-github-deploy` whose trust policy only accepts tokens from this repo:
  ```hcl
  condition {
    test     = "StringEquals"
    variable = "token.actions.githubusercontent.com:aud"
    values   = ["sts.amazonaws.com"]
  }
  condition {
    test     = "StringLike"
    variable = "token.actions.githubusercontent.com:sub"
    values = [
      "repo:lakshan89/pocket-wisdom:ref:refs/heads/main",
      "repo:lakshan89/pocket-wisdom:environment:*",
    ]
  }
  ```
  When a job declares `environment: qa`, GitHub sets `sub` to `repo:lakshan89/pocket-wisdom:environment:qa`, so both patterns are needed.
- Permissions for that role, for now: push to the ECR repository, plus `ecr:GetAuthorizationToken` (which only works on `*`). You'll add deploy permissions in steps 9 and 13.

**Outputs.** VPC ID, subnet IDs, ECR repository URL and role ARN. `env/` reads them with a `terraform_remote_state` data source.

**Done when.**

```bash
cd infra/foundation
terraform init && terraform plan       # read the plan before applying
terraform apply
aws ecr describe-repositories --repository-names pocket-wisdom
```

**Common mistakes.**

- Committing `.terraform/` or `*.tfstate`. Add `infra/**/.terraform/` and `*.tfstate*` to `.gitignore`. Commit `.terraform.lock.hcl`.
- `Error acquiring the state lock` after a crashed run. Use `terraform force-unlock <id>`, and only when you're sure no other run is active.

---

## Step 8: Push an image to ECR by hand

**Goal.** Do once by hand what the release workflow will automate, so you know what each pipeline step does.

**You'll learn.** Registry login, image tags compared with digests, and CPU architecture.

```bash
REGION=<your-region>
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REPO=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/pocket-wisdom

aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# Build for x86_64, the CPU type of the EC2 instance in step 9. On an
# Apple Silicon Mac, docker builds arm64 by default, which won't start there.
docker build --platform linux/amd64 --build-arg APP_VERSION=v0.0.1-manual -t $REPO:v0.0.1-manual .
docker push $REPO:v0.0.1-manual
```

**Done when.**

- `aws ecr describe-images --repository-name pocket-wisdom` lists the image and its `imageDigest`.
- Pushing the same tag again fails, because tags are immutable. That's the guarantee promotion relies on: `v0.0.1-manual` can never mean a different image.

Note the digest (`sha256:...`). From step 11 on, deploys refer to images by digest.

---

## Step 9: Terraform dev environment

**Goal.** Everything one environment needs: database, settings, server and load balancer. Build it for dev only. QA and prod reuse the same code in step 12.

**You'll learn.** Security groups, RDS, Parameter Store, instance profiles, ALB target groups, and parameterising Terraform per environment.

**Do this.** Branch `infra/dev-env`. In `infra/env/`, use a variable `env` (`dev`, `qa`, `prod`) in every resource name, for example `pocket-wisdom-${var.env}-alb`. Use a separate state key per environment, set at init time:

```bash
terraform init -backend-config="key=env/dev/terraform.tfstate"
terraform apply -var-file=dev.tfvars
```

**Security groups.** These are the firewall rules, and they're the core of the security model:

| Group | Inbound            | From                          |
| ----- | ------------------ | ----------------------------- |
| `alb` | 80 (and 443 later) | `0.0.0.0/0`                   |
| `app` | 3000               | the `alb` security group only |
| `db`  | 5432               | the `app` security group only |

Referencing security groups as the source, not IP ranges, means rules keep working as instances come and go.

**RDS.**

- `aws_db_subnet_group` over the 2 private subnets.
- `aws_db_instance`: engine `postgres`, version 17, `db.t4g.micro`, 20 GB `gp3`, `storage_encrypted = true`, `publicly_accessible = false`, the `db` security group.
- For practice environments, `skip_final_snapshot = true` and `deletion_protection = false`, so `terraform destroy` works. Set both the other way for anything real.
- Create the password with the `random_password` resource. It ends up in Terraform state, which is one reason the state bucket is private and encrypted.

**SSM parameters.** Use `aws_ssm_parameter`, one per variable, under `/pocket-wisdom/<env>/`:

| Name           | Type         | Value                                                                                                                  |
| -------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | SecureString | `postgres://<user>:<password>@<rds-endpoint>:5432/<db>?sslmode=verify-full&sslrootcert=/etc/ssl/rds/global-bundle.pem` |
| `APP_ENV`      | String       | `dev`                                                                                                                  |
| `NODE_ENV`     | String       | `production`                                                                                                           |
| `LOG_LEVEL`    | String       | `info`                                                                                                                 |
| `DOCS_ENABLED` | String       | `true` (try `false` in prod)                                                                                           |
| `JWT_SECRET`   | SecureString | from `random_password` (after step 5)                                                                                  |

URL-encode the password if it can contain characters such as `@` or `/`. The simplest fix is `special = false` on the `random_password`.

**EC2.**

- AMI: latest Amazon Linux 2023 for x86_64, looked up with an `aws_ssm_parameter` data source on `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`.
- `t3.small`, in a public subnet, with a public IP and the `app` security group.
- An instance profile whose role has:
  - `AmazonSSMManagedInstanceCore`, so you can run commands and open a shell without SSH (no port 22, no key pair)
  - `AmazonEC2ContainerRegistryReadOnly`, to pull images
  - `ssm:GetParametersByPath` and `ssm:GetParameters` on `arn:aws:ssm:<region>:<account>:parameter/pocket-wisdom/<env>*`
- `user_data` that installs and starts Docker:
  ```bash
  #!/bin/bash
  dnf install -y docker
  systemctl enable --now docker
  ```
- `metadata_options { http_tokens = "required" }`, which enforces IMDSv2.

**ALB.**

- `aws_lb` across the 2 public subnets, with the `alb` security group.
- `aws_lb_target_group`: port 3000, health check path `/health`, matcher `200`.
- `aws_lb_target_group_attachment` for the instance.
- `aws_lb_listener` on port 80 forwarding to the target group.

**Outputs.** ALB DNS name, instance ID, RDS endpoint.

**Done when.**

- `terraform apply -var-file=dev.tfvars` succeeds.
- `aws ssm start-session --target <instance-id>` opens a shell on the instance, and `docker --version` works there. (Install the Session Manager plugin for the AWS CLI first.)
- The ALB DNS name returns 502 for now, because nothing is running yet. That's expected.

**Common mistakes.**

- An instance that never shows up in Session Manager is missing `AmazonSSMManagedInstanceCore` or has no outbound internet access (check the public IP and route table).
- `no pg_hba.conf entry ... no encryption`: the URL is missing `sslmode`. RDS for Postgres 15+ requires TLS by default.

---

## Step 10: Deploy to dev by hand

**Goal.** Run the full deploy sequence yourself over SSM: migrate, seed, run. Step 11 will automate exactly these commands.

**You'll learn.** What the deploy pipeline does on the server, and how to debug it.

Open a session (`aws ssm start-session --target <instance-id>`), then:

```bash
REGION=<your-region>
ACCOUNT=<account-id>
IMAGE=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/pocket-wisdom:v0.0.1-manual

# 1. Write this environment's settings to a file only root can read
aws ssm get-parameters-by-path --path /pocket-wisdom/dev --with-decryption \
  --region $REGION --query 'Parameters[].[Name,Value]' --output text \
  | sed 's#^/pocket-wisdom/dev/##; s#\t#=#' | sudo tee /etc/pocket-wisdom.env >/dev/null
sudo chmod 600 /etc/pocket-wisdom.env

# 2. Pull the image
aws ecr get-login-password --region $REGION \
  | sudo docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com
sudo docker pull $IMAGE

# 3. Migrate and seed with the new image (stop if either fails)
sudo docker run --rm --env-file /etc/pocket-wisdom.env $IMAGE node dist/database/migrate.js
sudo docker run --rm --env-file /etc/pocket-wisdom.env $IMAGE node dist/database/seed.js

# 4. Replace the running app
sudo docker rm -f pocket-wisdom 2>/dev/null
sudo docker run -d --name pocket-wisdom --restart unless-stopped \
  --env-file /etc/pocket-wisdom.env -p 3000:3000 \
  --log-driver awslogs --log-opt awslogs-region=$REGION \
  --log-opt awslogs-group=/pocket-wisdom/dev --log-opt awslogs-create-group=true \
  $IMAGE
```

The `awslogs` driver sends the container's JSON logs to CloudWatch. It needs `logs:CreateLogGroup`, `logs:CreateLogStream` and `logs:PutLogEvents` on the instance role, so add those in Terraform. Or create the log group in Terraform with a 7-day retention and drop `awslogs-create-group`.

**Done when.**

```bash
curl http://<alb-dns-name>/health              # "version":"v0.0.1-manual","env":"dev"
curl http://<alb-dns-name>/v1/quotes/random
```

The logs also show up in CloudWatch under `/pocket-wisdom/dev`.

Turn steps 1 to 4 into a script (`scripts/deploy-ec2.sh` taking the environment and image as arguments). Step 11 sends that same script through `aws ssm send-command`.

---

## Step 11: Release workflow

**Goal.** Merging to `main` tags a version, builds the image once, pushes it and deploys it to dev, with no manual steps.

**You'll learn.** OIDC in Actions, passing outputs between jobs, reusable workflows, and why to deploy by digest.

**Do this.** Branch `ci/release`.

1. On GitHub, go to **Settings > Environments** and create `dev`. Add variables `AWS_REGION`, `AWS_ROLE_ARN`, `ECR_REPOSITORY` and `INSTANCE_ID`.
2. Give the deploy role (step 7) permission for `ssm:SendCommand` on the dev instance and the `AWS-RunShellScript` document, plus `ssm:GetCommandInvocation`.
3. Create `.github/workflows/release.yml`, triggered on `push` to `main`, with `concurrency: release` so two merges can't deploy at once.

**Job `release`** (permissions `contents: write`, `id-token: write`):

1. Checkout with full history.
2. Work out the next version from the Conventional Commits since the last tag, and push the tag. `mathieudutour/github-tag-action` does this (`fix` bumps patch, `feat` bumps minor, `!` bumps major). Set `default_bump: false`, so merges containing only `chore:`, `docs:` or `test:` commits create no tag, and skip the remaining steps when the action outputs no new tag.
3. `aws-actions/configure-aws-credentials` with `role-to-assume`. This is the OIDC step, and it's why the job needs `id-token: write`.
4. `aws-actions/amazon-ecr-login`.
5. `docker/build-push-action`, building `linux/amd64` with `APP_VERSION` as a build argument, tagged `:vX.Y.Z` and `:sha-<short-sha>`.
6. Expose the pushed **digest** as a job output.

**Reusable workflow `deploy.yml`** (`on: workflow_call`), with inputs `environment` and `image` (repository URL plus `@sha256:...`):

1. `environment: ${{ inputs.environment }}`. That one line enables the GitHub Environment's variables, approval rules and deployment history.
2. Configure AWS credentials.
3. Run the deploy script on the instance with `aws ssm send-command`, then poll `aws ssm get-command-invocation` until it finishes. Fail the job if the script failed.
4. Smoke test: `curl --fail http://<alb>/health` and check that `version` matches the release.

**Job `deploy-dev`** calls `deploy.yml` with `environment: dev` and the image digest from `release`.

> **Why deploy by digest.** A tag is a name and a digest is the content hash. Deploying `pocket-wisdom@sha256:abc...` guarantees QA and prod run byte-for-byte what dev tested, even if someone retagged the image.

> **Gotcha.** A tag pushed with the default `GITHUB_TOKEN` does not start other workflows. That's why tagging, building and deploying all live in one workflow.

**Done when.** Merging a `feat:` PR creates a new minor version tag, an image with that tag in ECR, and `/health` on dev showing the new version, with no manual steps.

---

## Step 12: QA and prod with approval gates

**Goal.** The image dev ran is promoted to QA, then prod, each after your approval, with no rebuild.

**Do this.**

1. Apply the env stack twice more:
   ```bash
   terraform init -reconfigure -backend-config="key=env/qa/terraform.tfstate"
   terraform apply -var-file=qa.tfvars
   # and the same for prod
   ```
2. On GitHub, create the `qa` and `prod` environments with **Required reviewers** set to yourself (free on public repos). Add the same variables, with each environment's values.
3. Widen the deploy role's `ssm:SendCommand` permission to the qa and prod instances.
4. In `release.yml`, add `deploy-qa` (`needs: deploy-dev`) and `deploy-prod` (`needs: deploy-qa`), both calling `deploy.yml` with the **same digest output** from the `release` job.

**Done when.**

- After a merge, the run deploys dev, then waits on "Review deployments" for qa.
- After you approve, qa's `/health` shows the same version as dev. Approve again for prod.
- `docker inspect` on each instance shows the same image digest.

**Rollback.** Add a `workflow_dispatch` workflow that takes an environment and an existing version tag, looks up the tag's digest in ECR, and calls `deploy.yml`. That covers both rollback and promoting an older version.

---

## Step 13: Move to ECS Fargate

**Goal.** Swap EC2 for Fargate without changing the image, the database or the pipeline's shape.

**You'll learn.** ECS clusters, task definitions, services, execution roles compared with task roles, and rolling deployments.

**Terraform** (in `infra/env/`):

- `aws_ecs_cluster`
- `aws_cloudwatch_log_group` `/ecs/pocket-wisdom-<env>`, with 7-day retention
- **Execution role.** ECS itself uses this role to pull the image and read secrets: `AmazonECSTaskExecutionRolePolicy` plus `ssm:GetParameters` on `/pocket-wisdom/<env>/*`.
- **Task role.** The app runs as this role. It needs nothing yet.
- `aws_ecs_task_definition`: `FARGATE`, `awsvpc` networking, 0.25 vCPU and 512 MB, one container on port 3000, `awslogs` logging. Secrets come from SSM:
  ```hcl
  secrets = [
    { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url.arn },
    # ...one entry per parameter
  ]
  ```
- A target group with `target_type = "ip"`. Fargate tasks register by IP, not by instance.
- `aws_ecs_service`: desired count 1, public subnets with `assign_public_ip = true`, the `app` security group, attached to the target group, and `deployment_circuit_breaker { enable = true, rollback = true }`.
- Add `lifecycle { ignore_changes = [task_definition] }` to the service. After the first apply, the pipeline owns which image is running, not Terraform.

**Pipeline** (`deploy.yml`):

1. Download the current task definition and set the new image with `aws-actions/amazon-ecs-render-task-definition`.
2. Run migrations as a one-off task from that task definition, with the command overridden:
   ```bash
   aws ecs run-task --cluster ... --task-definition ... --launch-type FARGATE \
     --network-configuration ... \
     --overrides '{"containerOverrides":[{"name":"api","command":["node","dist/database/migrate.js"]}]}'
   aws ecs wait tasks-stopped ...
   ```
   Then check the container's `exitCode` with `aws ecs describe-tasks`. `wait` returns once the task stops, whether it succeeded or not. Do the same for seed.
3. Deploy with `aws-actions/amazon-ecs-deploy-task-definition`, with `wait-for-service-stability: true`.
4. Give the deploy role `ecs:RegisterTaskDefinition`, `ecs:UpdateService`, `ecs:RunTask`, `ecs:DescribeTasks`, `ecs:DescribeServices`, and `iam:PassRole` on the two ECS roles.

Once Fargate works in all three environments, delete the EC2 resources and `scripts/deploy-ec2.sh`.

**Done when.** A merge rolls out a new Fargate task in dev with no downtime: the ALB keeps answering while the new task starts and the old one drains. Promotion to QA and prod works exactly as before.

---

## Step 14: Domain and HTTPS

**Goal.** `https://api.<your-domain>`, `https://qa-api...` and `https://dev-api...` with valid certificates.

**Do this.**

1. Buy a domain (Route 53 or any registrar). If it's registered elsewhere, create a Route 53 hosted zone and point the registrar's NS records at it.
2. In Terraform: an `aws_acm_certificate` per environment's hostname with DNS validation, the validation records in Route 53, and an `aws_acm_certificate_validation`.
3. Add an HTTPS listener on 443 with the certificate, and change the port 80 listener to redirect to HTTPS. Allow 443 in the `alb` security group.
4. Add an `aws_route53_record` alias from the hostname to the ALB.
5. In `src/app.setup.ts`, delete the `upgradeInsecureRequests: null` override. With HTTPS in place, helmet's default is correct.
6. Point the pipeline's smoke test at the HTTPS URL.

**Done when.** `curl -I http://dev-api.<domain>/health` returns 301 to HTTPS, and `curl https://dev-api.<domain>/health` returns 200.

---

## Shutting down

At the end of each session, destroy the environments, not the foundation:

```bash
cd infra/env
terraform init -reconfigure -backend-config="key=env/dev/terraform.tfstate"
terraform destroy -var-file=dev.tfvars
# repeat for qa and prod
```

Destroying the foundation stack too leaves only the state bucket. ECR keeps your images unless you delete the repository, and storing a few images costs cents.

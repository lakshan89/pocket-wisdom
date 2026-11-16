# syntax=docker/dockerfile:1

# ---- deps: every dependency, needed to compile ----
FROM node:24-alpine AS deps
WORKDIR /app
# Package files first. This layer is rebuilt only when dependencies change.
COPY package.json package-lock.json ./
# --ignore-scripts skips "prepare" (husky), which is useless in an image
RUN npm ci --ignore-scripts

# ---- build: compile TypeScript to dist/ ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod-deps: runtime dependencies only ----
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---- runtime: the image that actually ships ----
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# The release pipeline passes the git tag. /health reports it.
ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION

# CA bundle for verifying RDS TLS. Files ADDed from a URL default to mode 600
# (root only), so --chmod lets the node user read it.
ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/rds/global-bundle.pem

# Copied as root and read-only to the app. The app never writes to its own files.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Unprivileged user that ships with the official image (uid 1000)
USER node

EXPOSE 3000

# busybox wget is in alpine. curl isn't.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health > /dev/null || exit 1

# Run node directly, not npm, so SIGTERM reaches the app and it shuts down cleanly
CMD ["node", "dist/main.js"]

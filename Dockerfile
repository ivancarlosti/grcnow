# syntax=docker/dockerfile:1
# Multi-stage build shared by the API and the Web app.
#   docker build --target api -t grc-api .
#   docker build --target web -t grc-web .

FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat curl
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --no-frozen-lockfile

FROM deps AS build-api
COPY locales ./locales
COPY apps/api ./apps/api
RUN pnpm --filter @grc/api db:generate && pnpm --filter @grc/api build

FROM deps AS build-web
COPY apps/web ./apps/web
RUN pnpm --filter @grc/web build

FROM build-api AS api
ENV NODE_ENV=production
RUN mkdir -p /storage/app
COPY apps/api/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3001
CMD ["/entrypoint.sh"]

FROM build-web AS web
ENV NODE_ENV=production
ENV PORT=3000
COPY apps/web/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
CMD ["/entrypoint.sh"]

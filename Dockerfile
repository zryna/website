# syntax=docker/dockerfile:1.7

FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV ASTRO_TELEMETRY_DISABLED=1
ENV PNPM_CONFIG_FETCH_RETRIES=5
ENV PNPM_CONFIG_FETCH_RETRY_MINTIMEOUT=10000
ENV PNPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=60000

RUN corepack enable && corepack install --global pnpm@11.24.0

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm verify

FROM nginx:1.30.4-alpine3.24@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46 AS runtime

LABEL org.opencontainers.image.title="Zryna Website"
LABEL org.opencontainers.image.source="https://github.com/zryna/website"
LABEL org.opencontainers.image.licenses="Apache-2.0"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY LICENSE NOTICE /usr/share/licenses/zryna-website/
COPY --from=build /workspace/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/healthz || exit 1

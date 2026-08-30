# Zryna website

This repository contains the public website and documentation renderer for
[Zryna](https://github.com/zryna/zryna), a strict, JavaScript-friendly language being designed
for direct JavaScript, WebAssembly, and native targets.

The compiler repository owns language semantics, specifications, and generated reference data.
This repository owns presentation, navigation, deployment, and the public documentation
experience. It must not redefine compiler-owned behavior.

## Requirements

- Node.js 24.20.x
- pnpm 11.24.0
- Docker, for production-image verification

## Local development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Run every local quality gate with:

```sh
pnpm verify
```

The architecture checker fails closed when the exact root/source layout, required entry shape,
symlink policy, UTF-8 policy, or deterministic scan budget violates
[`zryna.website.json`](./zryna.website.json). The v1 profile does not claim AST-level MDX import or
browser-runtime enforcement; component roots stay forbidden until that complete owner engine is
implemented and tested.

## Production image

```sh
docker build --tag zryna-website:local .
docker run --rm --publish 127.0.0.1:8080:80 zryna-website:local
```

The container serves static files with nginx. Its health endpoint is `GET /healthz` on internal
port `80`.

Use these Dokploy application settings:

- Provider repository: `zryna/website`, branch `main`.
- Build type: `Dockerfile`.
- Repository build path: `/`.
- Dockerfile path: `Dockerfile`.
- Docker build context: `.`.
- Domain: `zryna.com`, path `/`, container port `80`.
- Do not publish an Advanced host port; Dokploy/Traefik owns public routing.
- Point the domain's DNS record to the Dokploy server before enabling HTTPS/Let's Encrypt.

Each push to `main` may redeploy only after the repository's required GitHub checks pass.

## Architecture

Read [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) before changing the
repository layout. Contribution and security policies are in
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`SECURITY.md`](./SECURITY.md).

## License

Licensed under the Apache License, Version 2.0. See [`LICENSE`](./LICENSE).

# Website architecture

## Purpose

The website is a static, public consumer of Zryna project information. It owns the visual system,
navigation, guides, deployment configuration, and rendering of compiler-produced reference data.
It does not own language semantics, the standard library contract, compiler diagnostics, or target
behavior.

## Repository contract

[`zryna.website.json`](../zryna.website.json) is the machine-readable layout contract. The
architecture checker validates it before type checking or building. Unknown contract fields,
unexpected root entries, unexpected `src` entries, wrong file/directory shapes, symlinks, invalid
UTF-8 text, and exceeded scan budgets are fatal. The v1 profile deliberately makes no AST-level
MDX import or browser-runtime claim; component roots remain forbidden until the complete owner
engine described below exists.

The stable roots are:

- `src/content`: authored public pages and imported compiler documentation.
- `src/styles`: site-wide tokens and presentation rules.
- `tools`: repository validation and deterministic documentation ingestion.
- `tests`: executable architecture and contract tests.
- `schemas`: versioned data-contract schemas.
- `public`: static assets copied without transformation.

Do not create a new root or `src` entry casually. Change the schema, contract, tests, and this
document in the same pull request when a new architectural responsibility is genuinely required.

`src/features` and `src/shared` are intentionally forbidden in the v1 website profile. They may be
introduced only with an Astro-specific implementation of Srijika's complete owner engine: canonical
Feature → Slot → Part ownership, UI/Connector pairs, progressive runtime layers, Shared ownership,
static import resolution, cycle checks, and negative fixtures. A partial regex approximation is not
an acceptable gate.

## Documentation authority

The compiler repository is the only source of truth for normative language material. Its
documentation exporter produces a versioned, deterministic bundle with checksums. This site
validates a separately locked bundle and renders it under versioned routes. Hand-authored website
pages may explain how to navigate or use published material, but cannot silently replace normative
compiler content.

The consumer contract is
[`schemas/zryna-docs-bundle-v1.schema.json`](../schemas/zryna-docs-bundle-v1.schema.json). A bundle
contains `manifest.json`, `manifest.sha256`, and only the Markdown documents explicitly listed by
the manifest. Canonical JSON, full source commits and refs, per-document sizes and SHA-256 digests,
stable ASCII ordering, hard scan budgets, and the absence of timestamps make exports reproducible
and auditable. `manifest.sha256` is not trusted by itself: ingestion also requires the expected
manifest digest, channel, commit, and ref from an authenticated compiler workflow or signed release.

Tracked raw bytes live in one explicitly registered channel directory under
`src/content/compiler-data`, while each registered lock is a reviewed trust root and source/route
map. `tools/docs/compiler-imports.mjs` is the closed registry; import never discovers locks or
channels from directory contents. The importer captures every registered bundle before mutation,
rejects active Markdown constructs and unsafe links, rewrites relative links to same-channel site
routes or immutable compiler permalinks, and owns the matching subtree under
`src/content/docs/reference/compiler`. `pnpm docs:sync` updates only those registered subtrees;
`pnpm docs:check` rejects stale, missing, extra, or manually edited output. Production builds never
fetch a moving branch or require cross-repository credentials.

After Astro renders the site, `pnpm routes:check` scans the bounded `dist` tree without following
links. It requires the exact authored and locked compiler HTML route inventory, rejects unexpected
HTML pages, and resolves every local HTML `href` and `src` target plus fragment identifier without
network access. This makes missing generated pages and broken local links build failures on every
supported CI host.

`pnpm content:check` then checks the rendered compiler identity and required M3 status, profile,
walkthrough, and conformance content. The same checker runs against the Docker HTTP server to
verify every published route and its configured security headers before publication.

## Request path

```text
browser -> Dokploy/Traefik (TLS) -> nginx :80 -> static Astro output
```

Astro produces static HTML, CSS, and JavaScript at build time. The production container contains
nginx only; Node.js and pnpm are not present in the runtime image. TLS and HSTS belong at the
Dokploy/Traefik boundary. nginx serves immutable hashed assets and exposes `/healthz`.

## Change gates

Every pull request must pass formatting, architecture tests, architecture validation, Astro type
checking, a production build, and a Docker smoke test. A layout change is incomplete until its
failure case is covered by an architecture test.

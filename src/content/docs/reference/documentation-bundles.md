---
title: Documentation bundles
description: How compiler-owned reference documentation reaches the Zryna website without duplication.
---

The compiler repository owns normative language and compiler documentation. The website owns its
presentation. An authenticated, deterministic, resource-bounded bundle is the active contract
between them.

## Producer flow

The compiler exposes commands equivalent to:

```sh
pnpm docs:check
pnpm docs:export --channel next --source-commit <commit> --source-ref refs/heads/main --output .zryna/out/docs/next
```

The dedicated compiler documentation workflow exports the exact final-main bundle only after
independently authenticating the complete foundation/M4 CI run and all six retained M4 evidence
artifacts. This site pins [run 38156672531](https://github.com/zryna/zryna/actions/runs/38156672531)
(attempt 1), compiler commit `418af134f16091affce76ca08fc49eb4b874072f`, compiler tree
`e371a1107aa57b1b152021e98ce749925edbffea`, and manifest SHA-256 `c163aae1b53fb6fb23a3001711a4cf88ab00087f1a61ff3004b0d6e5661e98ac`.
Artifact `11708548986` contains 57 compiler-owned documents.
Its authenticated archive SHA-256 is `7acae747514906859b0d82ed8da13357fa2b5a2b3281dcd2887f2ae3de0386c5`, distinct from the manifest digest.
The fixed registry SHA-256 is `e0eb908ce4b500ad558c25e351109cf5fea52c88bc07424810d1f42b4d9ec9ac`; the complete canonical support JSON
SHA-256 is `d1e805ada07fd50917c7914db334eb3ae437c1a1e5e96e4c2b6031eb46d9da08`. The [M4 support matrix](/reference/compiler/next/reference/m4-support/)
preserves every row, bound, grant and exclusion. The artifact assessment authenticates documentation
only; hosted website checks, deployment/image identity and live observations remain separate gates.

## Bundle contract

Each bundle contains:

- `manifest.json`, using `zryna.docs.bundle.v1`;
- `manifest.sha256`, covering the exact manifest bytes;
- only the UTF-8 Markdown files listed in the manifest.

The manifest records a full compiler commit, Git ref, source version, channel, stable document IDs
and paths, byte counts, and SHA-256 digests. Its canonical JSON serialization contains no generation
timestamp; the executable contract tests that identical input produces identical manifest bytes.

`manifest.sha256` detects accidental corruption but cannot authenticate itself. Ingestion therefore
also requires the expected manifest digest and channel from an authenticated compiler workflow,
signed release, or attestation. A bundle cannot choose its own trusted digest.

The website rejects unknown fields, unsorted or duplicate entries, symlinks, unlisted files,
oversized documents, invalid UTF-8, and checksum mismatches. A local bundle can be checked with:

```sh
node tools/docs/check-bundle.mjs /path/to/bundle \
  --expected-manifest-sha256 <authenticated-sha256> \
  --expected-channel next \
  --expected-source-commit <authenticated-commit> \
  --expected-source-ref refs/heads/main
```

## Publication channels

- `next` must come from `refs/heads/main` and follows reviewed compiler development.
- semantic-version bundle channels must equal `source.version` and come from the matching immutable
  `refs/tags/v<version>` tag.
- `stable` will be a website alias to one already verified semantic-version bundle; it is not a
  mutable bundle channel.

The immutable `v0.1.0` tag supplies the source-only Developer Preview channel. Its reviewed bundle
is pinned at compiler commit `f4d28002a014cd2e717eba4e59764bd925bef8c1` with manifest SHA-256
`838a30b84c68989775ee82bd9d36dcbd53838f29745527efefaac29d3f4d6daa` and is published under
the [0.1.0 reference](/reference/compiler/0.1.0/). The `next` channel remains separately registered
for reviewed compiler development.

The site vendors each reviewed bundle plus a separate trust lock; it never follows moving `main`
or downloads compiler content during a production build. Generated reference pages are checked
byte-for-byte on Linux and Windows.

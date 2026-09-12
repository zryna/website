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

The compiler's successful `main` CI exports the exact commit-and-digest-bound `next` artifact
only after the complete aggregate M3 gate (including M0–M2) passes. This site pins
[run 34091122586](https://github.com/zryna/zryna/actions/runs/34091122586), compiler commit `4c9fbda9ca80decf755fb8313474217e051eb5c8`, and manifest SHA-256
`7e3b3e597546737a0ebc175e8889cbf80b28d8b727313bf379916a6489a65f03`. Artifact `10007513825` contains 45 compiler-owned documents.
Its downloaded archive SHA-256 is `79e48bd995bcb89482186a2062212d5c2de5314dbf45ea6b5cbde0efa3f18c7d`; this is distinct from the manifest digest.
The archive metadata, exact inventory and source bytes were authenticated before updating the
trust lock. Two clean merged-main exports match each other and every official artifact file byte-for-byte.

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

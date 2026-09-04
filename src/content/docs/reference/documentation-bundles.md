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
pnpm docs:export -- --channel next --source-commit <commit> --source-ref refs/heads/main --output .zryna/out/docs/next
```

The compiler's successful `main` CI exports and uploads the exact commit-and-digest-bound `next`
artifact only after the complete aggregate M2 gate passes. This site pins the artifact from
[run 33853558039](https://github.com/zryna/zryna/actions/runs/33853558039), commit
`c3f828cafc762fcc9de123226d3f7f9403ad239f`, and manifest SHA-256
`c1afd7b4b1cb93bcfefc5da0084883405b46c19fefed32b011a833ab56a0e9bc`.
Artifact `9929801939` contains 35 compiler-owned documents. Its downloaded archive SHA-256 is
`f60bd16e5a015c1c3f95f6a4fd0598f9bbea52391421ce098cfcce547d164c49`;
this archive digest is distinct from the manifest digest above. The imported bytes were checked
against both the manifest and the compiler's exact source commit before updating the trust lock.

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

The compiler currently has no release tags, so `next` is the only valid present-day channel. This
site vendors one reviewed artifact plus a separate trust lock; it never follows moving `main` or
downloads compiler content during a production build. Generated reference pages are checked
byte-for-byte on Linux and Windows.

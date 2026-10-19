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
artifacts.

### Current M6 import

The authenticated 60-document import selects compiler commit `71fd69d99a39c22bdf262d1655a032aa76221f3e`,
tree `351da60bd4037e0f96c286045c8943f41fa99b03`, and manifest SHA-256
`697b7a79e08aa16542e95ca6902c8efa1a030a29ba0730a85795886e44a2e66b`.
[Documentation run 39176839216](https://github.com/zryna/zryna/actions/runs/39176839216)
(attempt 1) authenticated the successful exact-main CI run `39171574840` (attempt 1), all 42
jobs, and all six retained M4 lanes before export. Its gate artifact is `12154244709`, with
archive SHA-256 `bc09480ed767a57bb72ec452ab03716304196198b5e7b7199501c18cb0ebe34f`.
The documentation artifact is `12155045498`, with archive SHA-256
`719a922321514119245ce33e4d395ad02f28341c284999f0bb143feaf0056655`.
Every vendored bundle file matches that independently authenticated archive.

The import adds the [M6 support matrix](/reference/compiler/next/reference/m6-tooling/),
[conformance contract](/reference/compiler/next/reference/m6-conformance/), and
[reviewed-source route](/reference/compiler/next/reference/m6-reviewed-source-v2/).
The imported M4 matrix pins registry SHA-256
`2f2ed6bb851d1dc665db0abe98ca5dff912bf9b7b4b03b4f7d5b58044b762361`
and canonical support JSON SHA-256
`a78558f1489c62f2d4a96b2befa2e2689a1473d5460bd05a79aca361cddd6517`.

Documentation authentication does not establish complete M6 runtime acceptance. Treat the
integration as under verification until the published compiler and the matching immutable
[exact-source M6 acceptance record](https://github.com/zryna/zryna/releases/download/m6-source-evidence-71fd69d99a39c22bdf262d1655a032aa76221f3e-1/m6-source-evidence.json)
are available and independently verified against their selected identities. The compiler-owned
support matrix preserves the applicable profiles, limits, exclusions and separate approval gates.

### Previous M4 publication

The previous import was verified by [run 38156672531](https://github.com/zryna/zryna/actions/runs/38156672531)
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

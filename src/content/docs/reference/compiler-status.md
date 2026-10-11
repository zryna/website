---
title: Compiler status
description: The authenticated current compiler status imported from the compiler repository.
---

The website pins and validates the compiler-owned `next` bundle from commit
[`418af134f16091affce76ca08fc49eb4b874072f`](https://github.com/zryna/zryna/commit/418af134f16091affce76ca08fc49eb4b874072f).
Its manifest, source commit/ref, document inventory, sizes, and hashes are checked before the site
builds. The reviewed manifest SHA-256 is
`c163aae1b53fb6fb23a3001711a4cf88ab00087f1a61ff3004b0d6e5661e98ac`.

Exact public `--profile data-ownership-v1` selects the implemented M3 profile and manifest v3.
Read the [public surface](/reference/compiler/next/reference/m3-public-profile/) and
[M3 conformance](/reference/compiler/next/reference/m3-conformance/) for compiler-owned supported
and rejected boundaries. The website presents authenticated bytes without defining new semantics.

Start with [Your first M3 programs](/reference/compiler/next/reference/m3-getting-started/): setup,
complete sources, build/run, expected scalar output and safe create-only reruns. Aggregates,
String/Vec, explicit move/clone, lexical borrows, live/expired Weak upgrades, rejected programs and
executable corrections are included.

The [current status](/reference/compiler/next/status/current/) preserves default M1 and the
implemented M2 explicit profile. The [M1/M2 walkthrough](/reference/compiler/next/reference/getting-started/)
and [M2 conformance](/reference/compiler/next/reference/m2-conformance/) remain available.

M3 keeps owned values internal and public observations scalar. JavaScript and core WebAssembly
are verified on Linux x86-64 and Windows x64; native execution requires Linux x86-64 and the
specified GNU toolchain. Typed traps and deterministic cleanup use the compiler's fixed oracles.
Existing output bundles are never overwritten. Windows native execution, public owned/aggregate
ABI, escaping borrows, tracing GC, FFI, threads, WASI and Components remain unsupported within the M3 profile.

[Manifest v3](/reference/compiler/next/reference/m3-candidate-driver/) binds the source graph,
layout/runtime identities, artifact hashes and typed results. Historical component checkpoints
do not independently expand public support.

## v0.1.0 Developer Preview

The [source-only v0.1.0 Developer Preview](https://github.com/zryna/zryna/releases/tag/v0.1.0)
freezes compiler commit
[`f4d28002a014cd2e717eba4e59764bd925bef8c1`](https://github.com/zryna/zryna/commit/f4d28002a014cd2e717eba4e59764bd925bef8c1)
and documentation manifest SHA-256
`838a30b84c68989775ee82bd9d36dcbd53838f29745527efefaac29d3f4d6daa`.
Read the immutable [0.1.0 compiler reference](/reference/compiler/0.1.0/).

The reviewed source archives are
[`zryna-0.1.0.tar.gz`](https://github.com/zryna/zryna/releases/download/v0.1.0/zryna-0.1.0.tar.gz)
(`389700329d3a3b78b6c0aa182df747c0fb4f8ce2e01b1733e1be5439d0380a1f`, 2,459,048 bytes)
and
[`zryna-0.1.0.zip`](https://github.com/zryna/zryna/releases/download/v0.1.0/zryna-0.1.0.zip)
(`6654afacb1495b35cb36257d8cfe1387f54ae8f3b813b6fe802e4a035d55270f`, 3,331,980 bytes).
They contain complete source, not standalone binaries or installers.

Zryna remains experimental and not production-ready. Final milestone closure is recorded in
[Issue #90](https://github.com/zryna/zryna/issues/90) after deployment and live provenance checks.

## Bounded M4 components and capabilities

Read the [fixed M4 support matrix](/reference/compiler/next/reference/m4-support/) and
[conformance boundary](/reference/compiler/next/reference/m4-conformance/) before selecting a mode.
The static matrix defines twelve rows and records `not-evaluated`; it does not itself
authenticate execution, installation, signed release, deployment or milestone closure.

- [Browser scalar component](/reference/compiler/next/reference/browser-component-v1/): checkout build, pinned Chrome
  fixture, no guest imports; synchronous deadlines are post-hoc.
- [Command walkthrough](/reference/compiler/next/reference/wasi-command-getting-started/): checkout or a fresh
  content-verified installation, pure/error results and one caller-private literal environment key.
- [Finite status service](/reference/compiler/next/reference/wasi-server-status-v1/) and
  [separately approved clock/status](/reference/compiler/next/reference/wasi-server-clock-status-v1/): checkout-only
  loopback listeners; listener approval never grants guest clock permission.

Use the [command sources](/reference/compiler/next/examples/wasi-command/),
[status example](/reference/compiler/next/examples/wasi-server-status/) and
[denied/granted clock example](/reference/compiler/next/examples/wasi-server-clock/).
Installed components/browser/server, existing immutable beta H1, other browsers/platforms,
general WASI authority, signed release authentication and production admission remain excluded.
M0–M3 keep their existing profiles, bounds and manifests. The publication gate and milestone closure
remain recorded in [Issue #402](https://github.com/zryna/zryna/issues/402).

---
title: Compiler status
description: The authenticated current compiler status imported from the compiler repository.
---

The website pins and validates the compiler-owned `next` bundle from commit
[`4c9fbda9ca80decf755fb8313474217e051eb5c8`](https://github.com/zryna/zryna/commit/4c9fbda9ca80decf755fb8313474217e051eb5c8).
Its manifest, source commit/ref, document inventory, sizes, and hashes are checked before the site
builds. The reviewed manifest SHA-256 is
`7e3b3e597546737a0ebc175e8889cbf80b28d8b727313bf379916a6489a65f03`.

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
ABI, escaping borrows, tracing GC, FFI, threads, WASI and Components remain unsupported.

[Manifest v3](/reference/compiler/next/reference/m3-candidate-driver/) binds the source graph,
layout/runtime identities, artifact hashes and typed results. Historical component checkpoints
do not independently expand public support.

Zryna remains experimental and not production-ready. Final milestone closure is recorded in
[Issue #90](https://github.com/zryna/zryna/issues/90) after deployment and live provenance checks.

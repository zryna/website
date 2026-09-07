---
title: Architecture
description: A non-normative summary of Zryna's current components and intended three-target boundary.
---

This page is a non-normative public summary. The compiler repository's
[architecture document](https://github.com/zryna/zryna/blob/main/docs/ARCHITECTURE.md) and versioned
specifications are authoritative.

## Intended pipeline

Zryna is designed to use one semantic pipeline and three direct backends. JavaScript is not an
intermediate form for WebAssembly or native compilation, and no target output defines another
target's semantics.

```text
.zry source
    ↓
replaceable frontend reader
    ↓
Zryna syntax snapshot and strict semantics
    ↓
verified Universal IR
    ├── direct JavaScript backend → .js
    ├── direct WebAssembly backend → .wasm
    └── native lowering → native MIR → object/link → executable
```

The compiler-owned [architecture](/reference/compiler/next/reference/architecture/) describes
three separately selected profiles: default M1, explicit `control-flow-v1` M2, and explicit
`data-ownership-v1` M3. Their verified authorities and manifest versions remain separate.

For M3, protocol v4 authenticates source syntax before one sealed DataOwnershipV1 program,
both verified layouts and ownership-runtime ABI v1 reach the selected backends. The driver owns
module discovery, typed invocation and create-only atomic manifest-v3 publication. The public CLI
and candidate conformance route share one implementation. The website validates and renders
compiler-owned documentation bytes.

Use the [public M3 surface](/reference/compiler/next/reference/m3-public-profile/) for supported
hosts, typed traps and exclusions. The public ABI remains `i32`/`bool`; owned values are internal.
JavaScript, core WebAssembly and Linux x86-64 native are distinct target paths. Browser bindings,
WASI and Components remain later capabilities.

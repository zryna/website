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

This is the target boundary, not a description of an end-to-end compiler that already runs.

## Current foundation

- The TypeScript 6 adapter reads restricted exported function bodies into provider-neutral,
  source-map-verified protocol-v2 syntax snapshots. It does not own semantic lowering to IR.
- The current verified Universal IR covers a narrow scalar `i32` addition proof.
- The verified scalar ABI v1 authority seals scalar signatures, strict target carriers, typed
  observations, and deterministic names for JavaScript, core WebAssembly, and Linux x86-64.
- The JavaScript emitter is tested from already constructed verified IR.
- The native proof lowers constructed verified IR through an independently verified native MIR
  boundary to textual LLVM IR.
- No WebAssembly backend exists yet; direct core WebAssembly is an M1 implementation gate.
- The CLI currently provides architecture and diagnostic foundation commands, not `.zry`
  compilation.

The [normative scalar ABI v1 specification](https://github.com/zryna/zryna/blob/main/spec/abi/SCALAR_V1.md)
is complete, but the current emitters do not yet implement its public wrappers and `bool` remains
disabled in Universal IR.

## Planned responsibilities

The frontend-provider boundary is intended to let TypeScript 6, a future TypeScript 7 provider, and
an eventual Zryna-owned frontend produce the same versioned syntax contract. Semantic analysis,
ownership, exact numeric behavior, and diagnostics remain Zryna responsibilities.

The native lowering layer is planned to own layout, calling conventions, deterministic destruction,
object generation, linking, and platform legality checks. These capabilities are not implemented in
the present foundation slice.

The WebAssembly backend will consume verified Universal IR directly, emit validated core modules,
and begin with pure `i32` exports. Browser bindings, WASI, and Component Model profiles are later
capability-bearing layers rather than hidden foundation behavior.

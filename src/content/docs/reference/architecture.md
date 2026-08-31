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

This is now implemented for the narrow M1 `I32V1` profile. It is not a claim that later language
features or runtime profiles already exist.

## Current foundation

- The TypeScript 6 adapter reads restricted exported function bodies into provider-neutral,
  source-map-verified protocol-v2 syntax snapshots. It does not own semantic lowering to IR.
- The current verified Universal IR covers the narrow scalar M1 `i32` executable profile.
- The verified scalar ABI v1 authority seals scalar signatures, strict target carriers, typed
  observations, and deterministic names for JavaScript, core WebAssembly, and Linux x86-64.
- The source-driven JavaScript and core WebAssembly backends emit direct runnable artifacts from
  the same verified IR.
- Linux x86-64 native lowering emits a relocatable ELF object and links a dynamic executable through
  the verified native MIR boundary.
- The CLI provides atomic `build` and `run` commands for the checked profile.

The [normative scalar ABI v1 specification](https://github.com/zryna/zryna/blob/main/spec/abi/SCALAR_V1.md)
is implemented for the checked M1 `i32` wrappers; source-level `bool` remains deliberately disabled.

## Planned responsibilities

The frontend-provider boundary is intended to let TypeScript 6, a future TypeScript 7 provider, and
an eventual Zryna-owned frontend produce the same versioned syntax contract. Semantic analysis,
ownership, exact numeric behavior, and diagnostics remain Zryna responsibilities.

The native lowering layer owns the checked M1 Linux x86-64 object/link boundary. Broader layouts,
calling conventions, deterministic destruction, and additional platform legality rules remain
future capability-bearing work.

The WebAssembly backend consumes verified Universal IR directly and emits validated import-free core
modules for the M1 `i32` profile. Browser bindings, WASI, and Component Model profiles remain later
capability-bearing layers rather than hidden foundation behavior.

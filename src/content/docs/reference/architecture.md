---
title: Architecture
description: A non-normative summary of Zryna's current components and intended dual-target boundary.
---

This page is a non-normative public summary. The compiler repository's
[architecture document](https://github.com/zryna/zryna/blob/main/docs/ARCHITECTURE.md) and versioned
specifications are authoritative.

## Intended pipeline

Zryna is designed to use one semantic pipeline and two direct backends. JavaScript will not be an
intermediate form for native compilation, and native IR will not be translated back into
JavaScript.

```text
.zry source
    ↓
replaceable frontend reader
    ↓
Zryna syntax snapshot and strict semantics
    ↓
verified Universal IR
    ├── direct JavaScript backend → .js
    └── native lowering → native MIR → object/link → executable
```

This is the target boundary, not a description of an end-to-end compiler that already runs.

## Current foundation

- The TypeScript 6 adapter reads restricted function signatures into provider-neutral syntax
  snapshots. It does not parse bodies into Zryna IR.
- The current verified Universal IR covers a narrow scalar `i32` addition proof.
- The JavaScript emitter is tested from already constructed verified IR.
- The native proof lowers constructed verified IR to native MIR and textual LLVM IR.
- The CLI currently provides architecture and diagnostic foundation commands, not `.zry`
  compilation.

## Planned responsibilities

The frontend-provider boundary is intended to let TypeScript 6, a future TypeScript 7 provider, and
an eventual Zryna-owned frontend produce the same versioned syntax contract. Semantic analysis,
ownership, exact numeric behavior, and diagnostics remain Zryna responsibilities.

The native lowering layer is planned to own layout, calling conventions, deterministic destruction,
object generation, linking, and platform legality checks. These capabilities are not implemented in
the present foundation slice.

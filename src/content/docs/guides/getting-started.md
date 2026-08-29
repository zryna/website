---
title: Getting started
description: Understand what the current Zryna foundation can do and where the project is going.
---

Zryna is being built as a strict, JavaScript-friendly language with two direct output paths:
JavaScript and native code. It is not ready for production use yet.

## What works today

The repository has independent, tested foundation components:

- a TypeScript 6 adapter that reads a restricted function signature into a provider-neutral syntax
  snapshot;
- verified target-neutral IR for `i32` parameters, literals, and wrapping addition;
- direct JavaScript emission from an already constructed verified IR program;
- native MIR lowering and textual LLVM IR emission from constructed verified IR.

The adapter does not parse function bodies into IR, the backend proofs are not driven by source, and
the CLI does not compile `.zry` programs yet.

```ts
export function add(left: i32, right: i32): i32 {
  return left + right;
}
```

## What comes next

1. Connect the restricted source reader, semantic analysis, verified IR, and both backends for one
   executable vertical slice.
2. Complete native object emission and executable linking.
3. Add functions, control flow, modules, and cross-target tests.
4. Define owned data, deterministic drops, and the native runtime ABI.
5. Replace the bootstrap parser adapter with Zryna's own frontend over time.

Follow the compiler work in the [Zryna repository](https://github.com/zryna/zryna).

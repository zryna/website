---
title: Getting started
description: Understand what the current Zryna foundation can do and where the project is going.
---

Zryna is being built as a strict, JavaScript-friendly language with three direct output paths:
JavaScript, WebAssembly, and native code. It is not ready for production use yet.

## What works today

The repository has independent, tested foundation components:

- a TypeScript 6 adapter that reads restricted exported function bodies into a provider-neutral,
  source-map-verified protocol-v2 syntax snapshot;
- verified target-neutral IR for `i32` parameters, literals, and wrapping addition;
- direct JavaScript emission from an already constructed verified IR program;
- native MIR lowering and textual LLVM IR emission from constructed verified IR.

Zryna-owned semantic lowering does not yet turn that syntax into IR, no WebAssembly backend exists,
the JavaScript/native proofs are not driven by source, and the CLI does not compile `.zry` programs.

```ts
export function add(left: i32, right: i32): i32 {
  return left + right;
}
```

## What comes next

1. Freeze scalar ABI v1 and connect restricted syntax through Zryna semantics to verified IR.
2. Execute the first direct JavaScript and core WebAssembly artifacts.
3. Complete native object emission and executable linking.
4. Compare the same source and `i32` edge cases across all three targets.
5. Add control flow, modules, owned data, tooling, and eventually Zryna's own frontend in their
   dependency-ordered milestones.

Follow the compiler work in the [Zryna repository](https://github.com/zryna/zryna).

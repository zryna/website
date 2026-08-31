---
title: Getting started
description: Understand what the current Zryna foundation can do and where the project is going.
---

Zryna is being built as a strict, JavaScript-friendly language with three direct output paths:
JavaScript, WebAssembly, and native code. It is not ready for production use yet.

## What works today

The checked M1 `I32V1` profile provides one narrow end-to-end compiler slice:

- a TypeScript 6 adapter that reads restricted exported function bodies into a provider-neutral,
  source-map-verified protocol-v2 syntax snapshot;
- Zryna-owned semantic lowering into verified target-neutral IR for explicit `i32` parameters,
  results, literals, parameter references, and wrapping addition;
- a verified scalar ABI v1 contract for strict `i32`/`bool` carriers, typed outcomes, and
  deterministic exports on JavaScript, core WebAssembly, and Linux x86-64;
- direct ECMAScript and import-free core WebAssembly emission from the same verified IR;
- Linux x86-64 native MIR, relocatable ELF object emission, linking, and execution;
- `zryna build` and `zryna run` with atomic create-only output bundles and deterministic manifests;
- differential conformance over normal and wrapping-boundary cases across all three targets.

The language remains experimental and not production-ready. M1 does not claim source-level Boolean
execution, control flow, modules, heap values, browser execution, WASI, Windows/macOS native
execution, packages, watch mode, incremental builds, or M2 features.

```ts
export function add(left: i32, right: i32): i32 {
  return left + right;
}
```

## What comes next

1. Preserve M1 with the authenticated compiler documentation and three-target conformance gates.
2. Add control flow and functions through the same verified semantic pipeline in M2.
3. Add modules, owned data, tooling, and eventually Zryna's own frontend in their
   dependency-ordered milestones.

Read the [authenticated current compiler status](/reference/compiler-status/) or follow the
[Zryna repository](https://github.com/zryna/zryna).

---
title: Getting started
description: Understand what the current Zryna foundation can do and where the project is going.
---

Zryna is being built as a strict, JavaScript-friendly language with three direct output paths:
JavaScript, WebAssembly, and native code. It is not ready for production use yet.

For installation, runnable examples, expected results, and common errors, follow
[Run your first Zryna programs](/reference/compiler/next/reference/getting-started/).
That compiler-owned walkthrough explains the exact toolchain, M1/M2 profile selection,
fresh output names, and supported target/platform combinations.

## What works today

The default M1 `I32V1` profile provides one narrow end-to-end compiler slice:

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

Exact `--profile control-flow-v1` selects the implemented M2 scalar profile. It adds typed `bool`,
bindings and assignment, direct nonrecursive calls, `if`, `while`, and compiler-owned explicit
relative modules. One authenticated module graph and verified program drive JavaScript, core
WebAssembly, and Linux x86-64 native output under the fixed-oracle Linux/Windows M2 gate.

The language remains experimental and not production-ready. The current profiles do not claim heap
values, an allocator or tracing-GC profile, browser execution, WASI, Windows/macOS native execution,
packages, watch mode, or incremental builds. Their scalar-only design is not a general zero-runtime
or GC-free guarantee for future data profiles.

```ts
export function add(left: i32, right: i32): i32 {
  return left + right;
}
```

## What comes next

1. Preserve the default M1 path and explicit M2 profile with authenticated cross-target gates.
2. Specify owned data, layout, allocation, and runtime profiles without silently broadening either
   scalar profile.
3. Add tooling, packages, broader platform profiles, and eventually Zryna's own frontend in their
   dependency-ordered milestones.

Read the [authenticated current compiler status](/reference/compiler-status/) or follow the
[Zryna repository](https://github.com/zryna/zryna).

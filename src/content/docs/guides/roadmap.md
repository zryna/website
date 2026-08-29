---
title: Roadmap
description: The ordered path from Zryna's compiler proof to a usable dual-target language.
---

Zryna is being developed through narrow, executable vertical slices. Each slice must preserve one
set of language semantics across JavaScript and native targets; a backend cannot quietly reinterpret
the program for its own convenience.

This page is a non-normative public planning summary. The compiler repository's
[roadmap](https://github.com/zryna/zryna/blob/main/docs/ROADMAP.md) is authoritative.

## 0. Foundation

- Establish the compiler workspace, repository rules, diagnostics, and architecture gates.
- Independently test the TypeScript 6 syntax adapter, verified `i32` IR, JavaScript emitter, native
  MIR lowering, and textual LLVM IR emitter.
- Establish the public website, documentation boundary, reproducible docs-bundle contract, CI, and
  production container.

## 1. Executable native slice

- Connect restricted source, semantics, verified IR, and both backends for the first end-to-end
  program.
- Lower the native proof into an executable rather than stopping at textual LLVM IR.
- Test the same source program against JavaScript and native outputs.
- Record target triples, toolchain requirements, and deterministic diagnostics.

## 2. Language core

- Add functions, modules, bindings, control flow, exact numeric types, and target-neutral errors.
- Define the JavaScript-compatible subset and the strict universal subset explicitly.
- Keep TypeScript integration behind a replaceable frontend-provider boundary.

## 3. Ownership and runtime

- Define owned values, borrowing rules, deterministic destruction, and the native ABI.
- Keep garbage collection optional and explicit where a managed runtime profile is eventually
  useful; native code must not silently acquire a collector.
- Specify foreign-function boundaries and platform behavior before broad library work.

## 4. Tooling and packages

- Stabilize the CLI, formatter, language server, editor extension, package manifest, and registry
  policy.
- Publish signed compiler artifacts and versioned compiler-owned documentation bundles.
- Add compatibility suites that run representative programs through both backends.

## 5. Independent frontend

- Replace the bootstrap TypeScript frontend provider with Zryna's owned parser and type system.
- Preserve the provider contract long enough to compare old and new frontends over the same corpus.
- Remove the bootstrap dependency only after behavior and diagnostics are demonstrably equivalent.

Milestone dates are intentionally not promised yet. Correct semantics, reproducible builds, and
cross-target conformance are release gates.

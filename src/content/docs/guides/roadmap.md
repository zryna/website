---
title: Roadmap
description: The ordered path from Zryna's compiler proof to a usable three-target language.
---

Zryna is being developed through narrow, executable vertical slices. Each slice must preserve one
set of language semantics across JavaScript, WebAssembly, and native targets; a backend cannot
quietly reinterpret the program for its own convenience.

This page is a non-normative public planning summary. The compiler repository's
[authenticated roadmap](/reference/compiler/next/status/roadmap/) is authoritative.

## 0. Foundation

- Establish the compiler workspace, repository rules, diagnostics, and architecture gates.
- Independently test the TypeScript 6 syntax adapter, verified `i32` IR, JavaScript emitter, native
  MIR lowering, and textual LLVM IR emitter.
- Establish the public website, documentation boundary, reproducible docs-bundle contract, CI, and
  production container.

## 1. First three-target executable slice

Completed for the deliberately narrow M1 `I32V1` profile:

- restricted source now crosses Zryna semantics and verified IR into direct ECMAScript, core
  WebAssembly, and Linux x86-64 native outputs;
- build/run bundles are atomic and deterministic, and the same normal and overflow cases are
  compared across all three targets;
- target, ABI, toolchain, portability, and deliberately unsupported boundaries are recorded in the
  [authenticated M1 evidence](/reference/compiler/next/status/m1-conformance/).

## 2. Scalar control flow and modules

Completed as the explicit M2 `control-flow-v1` profile:

- typed scalar bindings, assignment, direct nonrecursive calls, `if`, and `while` lower through one
  verified semantic pipeline;
- compiler-owned explicit relative modules form one authenticated graph and deterministic atomic
  manifest-v2 bundle;
- JavaScript, core WebAssembly, and Linux x86-64 native execution match one fixed oracle on the
  required Linux/Windows M2 gate;
- the TypeScript integration remains behind a replaceable frontend-provider boundary, and omitting
  `--profile` preserves M1.

## 3. Ownership and runtime

Public compiler activation is available through exact `--profile data-ownership-v1` and manifest
v3. The [public surface](/reference/compiler/next/reference/m3-public-profile/),
[conformance](/reference/compiler/next/reference/m3-conformance/), and
[beginner guide](/reference/compiler/next/reference/m3-getting-started/) describe observed behavior.

Final milestone closure requires the merged-commit bundle, exact website import, hosted checks,
deployment, live provenance and independent review. Its final state is recorded in
[Issue #90](https://github.com/zryna/zryna/issues/90). Public activation does not add tracing GC,
WASI/Components, a public owned ABI, FFI, threads or broader native platforms.

## 4. Tooling and packages

- Stabilize the CLI, formatter, language server, editor extension, package manifest, and registry
  policy.
- Publish signed compiler artifacts and versioned compiler-owned documentation bundles.
- Add compatibility suites that run representative programs through every supported backend.

## 5. Independent frontend

- Replace the bootstrap TypeScript frontend provider with Zryna's owned parser and type system.
- Preserve the provider contract long enough to compare old and new frontends over the same corpus.
- Remove the bootstrap dependency only after behavior and diagnostics are demonstrably equivalent.

Milestone dates are intentionally not promised yet. Correct semantics, reproducible builds, and
cross-target conformance are release gates.

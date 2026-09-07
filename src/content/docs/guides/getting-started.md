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

## Learn M3

[Your first M3 programs](/reference/compiler/next/reference/m3-getting-started/) is the
compiler-owned beginner path for exact `--profile data-ownership-v1`. Follow setup, complete
sources, build/run, expected scalar output and safe create-only reruns. Try aggregates, String/Vec,
ownership, lexical borrows and Shared/Weak, with rejected programs and executable corrections.

The [public M3 profile](/reference/compiler/next/reference/m3-public-profile/) documents supported
hosts, scalar-only public observations, typed traps, resource limits and rejected capabilities.
The [conformance evidence](/reference/compiler/next/reference/m3-conformance/) binds the authorities.
Zryna remains experimental and not production-ready.

## Earlier profiles remain available

Omitting `--profile` preserves M1. Exact `--profile control-flow-v1` selects M2 scalar control flow
and relative modules. Independent manifests and fixed-oracle regression gates remain unchanged.
Use [Run your first Zryna programs](/reference/compiler/next/reference/getting-started/) for M1/M2.

M3 does not add a public aggregate ABI, browser bindings, WASI, Components, Windows/macOS native
execution, tracing collector, FFI or threads. This is not a general zero-runtime or GC-free guarantee
for future profiles. Read the [authenticated status](/reference/compiler-status/) for provenance.

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

Current source checkouts use the embedded native frontend by default for M1–M3 compilation.
Ordinary compilation requires no Node.js or pnpm; JavaScript/WebAssembly execution still needs
its separately selected runtime. Read the [provider migration guide](/reference/compiler/next/reference/native-provider-migration/)
for explicit bootstrap/compare modes, source-candidate installation and troubleshooting.

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

## Bounded M4 components and capabilities

Read the [fixed M4 support matrix](/reference/compiler/next/reference/m4-support/) and
[conformance boundary](/reference/compiler/next/reference/m4-conformance/) before selecting a mode.
The static matrix defines twelve rows and records `not-evaluated`; it does not itself
authenticate execution, installation, signed release, deployment or milestone closure.

- [Browser scalar component](/reference/compiler/next/reference/browser-component-v1/): checkout build, pinned Chrome
  fixture, no guest imports; synchronous deadlines are post-hoc.
- [Command walkthrough](/reference/compiler/next/reference/wasi-command-getting-started/): checkout or a fresh
  content-verified installation, pure/error results and one caller-private literal environment key.
- [Finite status service](/reference/compiler/next/reference/wasi-server-status-v1/) and
  [separately approved clock/status](/reference/compiler/next/reference/wasi-server-clock-status-v1/): checkout-only
  loopback listeners; listener approval never grants guest clock permission.

Use the [command sources](/reference/compiler/next/examples/wasi-command/),
[status example](/reference/compiler/next/examples/wasi-server-status/) and
[denied/granted clock example](/reference/compiler/next/examples/wasi-server-clock/).
Installed components/browser/server, existing immutable beta H1, other browsers/platforms,
general WASI authority, signed release authentication and production admission remain excluded.
M0–M3 keep their existing profiles, bounds and manifests. The publication gate and milestone closure
remain recorded in [Issue #402](https://github.com/zryna/zryna/issues/402).

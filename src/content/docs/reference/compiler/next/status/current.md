---
title: "Compiler status"
description: "Compiler-owned next documentation imported from 90615aecbbdc."
---

> Verified compiler source: [docs/STATUS.md](https://github.com/zryna/zryna/blob/90615aecbbdc27836bbed3992d6736909f82ab58/docs/STATUS.md) at commit `90615aecbbdc27836bbed3992d6736909f82ab58`.

# Compiler status

Status channel: `next`

Zryna is an experimental compiler project. It is not production-ready, and the current executable
profile is intentionally narrow.

## Implemented M1 slice

- One workspace-relative `.zry` entrypoint is read through the pinned TypeScript 6 syntax provider,
  checked by Zryna semantics, and admitted through one verified Universal IR authority.
- The executable `I32V1` profile supports exported functions with explicit `i32` parameters and
  results, in-range decimal literals, parameter references, and signed wrapping `i32` addition.
- `zryna build` emits direct ECMAScript modules, import-free core WebAssembly modules, and audited
  Linux x86-64 ELF objects through explicit `javascript`, `webassembly`, `native`, or `all` target
  selection.
- `zryna run` executes JavaScript, core WebAssembly, and Linux x86-64 native artifacts for one typed
  scalar invocation and commits one complete create-only bundle.
- The M1 conformance suite observes `1 + 2`, `i32::MAX + 1`, and `i32::MIN - 1` through all three
  targets on Linux, compares fixed expected values and typed outcomes, and audits the manifest and
  exact artifact inventory.
- Linux and Windows both verify JavaScript/WebAssembly behavior, target-independent source
  rejection, Boolean scalar-carrier normalization, and repository portability. Windows native and
  `all` execution fail closed with `ZRYNA-N4002` and publish no bundle.

## Runtime and toolchain boundary

- JavaScript and WebAssembly execution require an absolute direct Node.js `22.22.1` executable.
- Native object emission is fixed to `x86_64-unknown-linux-gnu` and uses pinned pure-Rust Cranelift.
- Native executable linking and execution require canonical `/usr/bin/gcc` and GNU ld versions
  documented in the CLI and native executable specifications.
- Successful build and run output is published only below `.zryna/out` in atomic, create-only
  bundles with a deterministic manifest.

## Deliberately unsupported

Source-level Boolean execution remains verifier-gated even though scalar ABI v1 specifies strict
Boolean host carriers. The current slice does not claim control flow, modules, heap values,
browser execution, WASI, Windows or macOS native execution, static native executables, package
resolution, watch mode, incremental builds, production readiness, or any M2 feature.

## Evidence and reference

- [CLI contract](/reference/compiler/next/reference/cli/)
- [Compiler architecture](/reference/compiler/next/reference/architecture/)
- [M1 conformance evidence](/reference/compiler/next/status/m1-conformance/)
- [Roadmap](/reference/compiler/next/status/roadmap/)
- [Scalar ABI v1](/reference/compiler/next/reference/scalar-abi-v1/)
- [Language overview](/reference/compiler/next/reference/language-overview/)

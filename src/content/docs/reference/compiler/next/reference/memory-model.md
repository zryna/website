---
title: "Memory model direction"
description: "Compiler-owned next documentation imported from 97eb9c8b64f9."
---

> Verified compiler source: [spec/memory-model/OVERVIEW.md](https://github.com/zryna/zryna/blob/97eb9c8b64f9e534ad76de996c2eece85a25f729/spec/memory-model/OVERVIEW.md) at commit `97eb9c8b64f9e534ad76de996c2eece85a25f729`.

# Memory model direction

M1 and M2 contain only scalar values and require neither heap allocation nor garbage collection.
M3 is specified, but not implemented, as the separate explicit `DataOwnershipV1` profile. Its
normative authorities are:

- [data and ownership semantics](/reference/compiler/next/reference/data-ownership-v1/);
- [aggregate layout v1](/reference/compiler/next/reference/aggregate-layout-v1/); and
- [ownership runtime ABI v1](/reference/compiler/next/reference/ownership-runtime-v1/).

The profile uses value semantics by default, unique ownership for heap values, deterministic drop,
bounded lexical borrowing, explicit shared reference counting, and explicit weak references for
cycles. No-GC does not mean no heap: it means source lifetime behavior does not require a tracing
collector.

JavaScript still runs inside an engine that uses garbage collection internally. That implementation
detail may not weaken source move, borrow, drop, shared, or weak rules; compiler-controlled helpers
must make the specified transitions deterministic. Core WebAssembly and native targets use the
versioned non-Rust runtime ABI and exact checked layouts.

Tracing GC, raw pointers, unsafe operations, FFI, threads, custom allocators, public aggregate ABI,
WASI, Components, and freestanding targets remain outside M3. The digest-pinned planning registry
is `tests/m3-contract-v1.json`; its presence does not activate the public profile.

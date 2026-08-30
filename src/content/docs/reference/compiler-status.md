---
title: Compiler status
description: An honest snapshot of the current Zryna compiler foundation.
---

The compiler repository is the authority for implementation status. This website presents that
status and will later import verified, versioned documentation bundles from compiler releases.

## Current component proofs

- The TypeScript 6 adapter reads restricted exported function bodies into a provider-neutral,
  source-map-verified protocol-v2 syntax snapshot; it does not own semantic lowering.
- Verified Universal IR supports `i32` parameters, literals, and wrapping addition.
- Scalar ABI v1 verifies `i32` and `bool` signatures, deterministic JavaScript, core WebAssembly,
  and Linux x86-64 export mappings, strict host carriers, and typed target outcomes.
- A library-level backend emits signed 32-bit JavaScript such as `(a + b) | 0` from constructed
  verified IR.
- Another library-level path lowers constructed verified IR to native MIR and textual LLVM IR
  containing `add i32`.

These components are not connected into a source-to-output compiler command. Scalar ABI v1 is
specified and verified, but `bool` remains disabled in Universal IR and current emitters are not
public ABI v1 implementations. There is no WebAssembly backend, host invocation is not wired
end-to-end, and native object emission and executable linking are incomplete.

Read the compiler-owned [scalar ABI v1 specification](https://github.com/zryna/zryna/blob/main/spec/abi/SCALAR_V1.md)
and its [merged implementation evidence](https://github.com/zryna/zryna/pull/32).

See the compiler's [current vertical slice](https://github.com/zryna/zryna#current-vertical-slice)
for the authoritative status.

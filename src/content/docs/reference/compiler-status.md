---
title: Compiler status
description: An honest snapshot of the current Zryna compiler foundation.
---

The compiler repository is the authority for implementation status. This website presents that
status and will later import verified, versioned documentation bundles from compiler releases.

## Current component proofs

- The TypeScript 6 adapter reads a restricted exported function signature into a provider-neutral
  syntax snapshot; it does not lower the function body.
- Verified Universal IR supports `i32` parameters, literals, and wrapping addition.
- A library-level backend emits signed 32-bit JavaScript such as `(a + b) | 0` from constructed
  verified IR.
- Another library-level path lowers constructed verified IR to native MIR and textual LLVM IR
  containing `add i32`.

These components are not connected into a source-to-output compiler command. Native object emission
and executable linking are also incomplete.

See the compiler's [current vertical slice](https://github.com/zryna/zryna#current-vertical-slice)
for the authoritative status.

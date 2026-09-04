---
title: Compiler status
description: The authenticated current compiler status imported from the compiler repository.
---

The website pins and validates the compiler-owned `next` bundle from commit
[`b5be0a8e14cd45f40597f3028e9a38bd4c0bc510`](https://github.com/zryna/zryna/commit/b5be0a8e14cd45f40597f3028e9a38bd4c0bc510).
Its manifest, source commit/ref, document inventory, sizes, and hashes are checked before the site
builds. The reviewed manifest SHA-256 is
`baf8774c392089039ec06fa53064aabdba712070b07fa656f1289f1dfadb2979`.

[Read the imported current status](/reference/compiler/next/status/current/), including the default
M1 boundary, implemented M2 explicit profile, toolchain evidence, and deliberately unsupported
capabilities. The [M2 conformance evidence](/reference/compiler/next/reference/m2-conformance/) and
[control-flow contract](/reference/compiler/next/reference/control-flow-modules-v1/) are imported
from the same authenticated bundle.

The [M3 borrowing evidence](/reference/compiler/next/reference/m3-borrowing-semantics/) documents a
completed bounded internal Issue #82 boundary: shared/exclusive Copy-root borrows, bounded
reborrowing, one canonical conditional and bool-root loop, static Copy projections, and exact
whole-root direct calls. Lexical authorities end before control-flow edges; call access cannot
escape. Nested/repeated control-flow borrowing and dynamic/Vec source projections remain later
work. This is internal compiler evidence, not a public language profile.

The [first-program walkthrough](/reference/compiler/next/reference/getting-started/) covers the
public M1/M2 workflow. The [Shared/Weak authority contract](/reference/compiler/next/reference/m3-shared-weak-authority/)
and [evidence matrix](/reference/compiler/next/reference/m3-shared-weak-evidence/) distinguish
verified contracts from remaining implementation and runtime evidence.

M1 default and explicit M2 remain the only public profiles. The imported borrowing evidence does
not activate general M3 support or add runtime lifetime state, an ABI, a backend path, a driver or
CLI route, or a target artifact.

Zryna remains experimental and not production-ready.

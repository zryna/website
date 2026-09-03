---
title: Compiler status
description: The authenticated current compiler status imported from the compiler repository.
---

The website pins and validates the compiler-owned `next` bundle from commit
[`97eb9c8b64f9e534ad76de996c2eece85a25f729`](https://github.com/zryna/zryna/commit/97eb9c8b64f9e534ad76de996c2eece85a25f729).
Its manifest, source commit/ref, document inventory, sizes, and hashes are checked before the site
builds. The reviewed manifest SHA-256 is
`665498348a30b6fd62cfe17bdd270eadab22b8f982dae302d748d7886dfa19bf`.

[Read the imported current status](/reference/compiler/next/status/current/), including the default
M1 boundary, implemented M2 explicit profile, toolchain evidence, and deliberately unsupported
capabilities. The [M2 conformance evidence](/reference/compiler/next/reference/m2-conformance/) and
[control-flow contract](/reference/compiler/next/reference/control-flow-modules-v1/) are imported
from the same authenticated bundle.

The [M3 borrowing evidence](/reference/compiler/next/reference/m3-borrowing-semantics/) documents a
bounded private straight-line, exact-signature, whole-root direct-call boundary. Borrow authority
cannot escape the call and remains governed by the compiler's verifier and resource limits. This
is internal compiler evidence, not a public language profile.

M1 default and explicit M2 remain the only public profiles. The imported borrowing evidence does
not activate general M3 support or add runtime lifetime state, an ABI, a backend path, a driver or
CLI route, or a target artifact.

Zryna remains experimental and not production-ready.

---
title: Compiler status
description: The authenticated current compiler status imported from the compiler repository.
---

The website pins and validates the compiler-owned `next` bundle from commit
[`8461e2677b397a4cda4431197b4b2ff17237cdf4`](https://github.com/zryna/zryna/commit/8461e2677b397a4cda4431197b4b2ff17237cdf4).
Its manifest, source commit/ref, document inventory, sizes, and hashes are checked before the site
builds. The reviewed manifest SHA-256 is
`78c2bdc64f184e65deb7dde815b0dc847b34b99f36a0e4206b56fe24b21900e7`.

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

The [ownership composition contract](/reference/compiler/next/reference/m3-ownership-composition/)
and [composition evidence matrix](/reference/compiler/next/reference/m3-ownership-composition-evidence/)
describe the planned integration of ownership features and the evidence still required. These
documents are implementation contracts, not runnable public M3 examples or completed runtime support.

M1 default and explicit M2 remain the only public profiles. The imported borrowing evidence does
not activate general M3 support or add runtime lifetime state, an ABI, a backend path, a driver or
CLI route, or a target artifact.

Zryna remains experimental and not production-ready.

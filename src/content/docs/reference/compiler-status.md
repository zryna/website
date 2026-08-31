---
title: Compiler status
description: The authenticated current compiler status imported from the compiler repository.
---

The website pins and validates the compiler-owned `next` bundle from commit
[`0b80816b7bca4d619c4716f1f15c993b30edb613`](https://github.com/zryna/zryna/commit/0b80816b7bca4d619c4716f1f15c993b30edb613).
Its manifest, source commit/ref, document inventory, sizes, and hashes are checked before the site
builds. The reviewed manifest SHA-256 is
`ea927d2cfd88a63e309be0a4c716c1ea2f9a3b40f50e5547122300a212314bb4`.

[Read the imported current status](/reference/compiler/next/status/current/), including the default
M1 boundary, implemented M2 explicit profile, toolchain evidence, and deliberately unsupported
capabilities. The [M2 conformance evidence](/reference/compiler/next/reference/m2-conformance/) and
[control-flow contract](/reference/compiler/next/reference/control-flow-modules-v1/) are imported
from the same authenticated bundle.

Zryna remains experimental and not production-ready.

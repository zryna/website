---
title: "Bounded H1 command examples"
description: "Compiler-owned next documentation imported from b3be654c452e."
---

> Verified compiler source: [examples/wasi-command/README.md](https://github.com/zryna/zryna/blob/b3be654c452ea51f2c136a75d2eb89995eb4bd66/examples/wasi-command/README.md) at commit `b3be654c452ea51f2c136a75d2eb89995eb4bd66`.

# Bounded H1 command examples

Follow [the command walkthrough](/reference/compiler/next/reference/wasi-command-getting-started/) for complete
checkout and fresh content-verified installation commands, pinned runtime requirements and
Linux/Windows private-file creation. `pure.zry` returns WIT `ok(())`; `error.zry` returns
`err(())`; `lookup.zry` has one literal `MODE` environment lookup and requires a matching
explicit caller-private request. Pure source rejects a grant file. No ambient environment
value is read and no additional capability is granted.

These examples map to the two command modes in [the M4 matrix](/reference/compiler/next/reference/m4-support/).
Existing immutable beta archives remain excluded. Content verification does not establish a
signed package release or production admission. A runnable example and a successful process
exit do not authenticate complete both-host M4 evidence or live publication.

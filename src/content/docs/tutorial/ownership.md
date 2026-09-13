---
title: 6. Ownership, moves, and clones
description: Learn when Zryna moves an owned value and when to clone it.
---

This lesson follows the exact Zryna `0.2.1` ownership surface at [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446), documented in [`M3_OWNED_DATA_SEMANTICS.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M3_OWNED_DATA_SEMANTICS.md).

Look again at the supplied String example:

```zry
export function text(): i32 {
  let first: String = "héllo";
  const copy: String = clone(first);
  const moved: String = copy;
  first = "new";
  const joined: String = concat(first, moved);
  return 17;
}
```

`String`, `Vec`, and aggregates containing owned values are non-Copy:

- `clone(first)` makes a distinct owned String and leaves `first` usable.
- `const moved: String = copy` transfers ownership; `copy` is no longer usable.
- assignment into `first` replaces and cleans up its old owned value.
- values still owned at scope exit are cleaned up in verified reverse order.

Run the wrapper on both targets:

```powershell
& $zryna run src/string.zry --project-root "$workspace\tutorial-ownership" --profile data-ownership-v1 --target javascript --name ownership-js --export score
& $zryna run src/string.zry --project-root "$workspace\tutorial-ownership" --profile data-ownership-v1 --target webassembly --name ownership-wasm --export score
```

Expected observations are `javascript: i32 17` and `webassembly: i32 17`. The sentinel proves that execution reached the return after the owned operations; the release conformance suite, not the sentinel alone, proves exact cleanup behavior.

## Common error: use after move

This private function is rejected:

```zry
function invalid(): String {
  const text: String = "owned";
  const moved: String = text;
  return text;
}
```

`text` was consumed by the move. Diagnostic `ZRYNA-M3011` tells you to return `moved`, or initialize `moved` with `clone(text)` when both owners are needed. Zryna does not add an implicit clone.

## Exercise

Trace the owners after each line of the valid String example. At the end, which names still own a value, and which name was consumed?

[← Data shapes](/tutorial/data-shapes/) · [Continue to borrowing →](/tutorial/borrowing/)

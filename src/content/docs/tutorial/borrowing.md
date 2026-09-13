---
title: 7. Borrowing
description: Use lexical shared and exclusive borrows without transferring ownership.
---

Zryna `0.2.1` at [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446) publishes bounded lexical borrowing through `data-ownership-v1`. See [`M3_BORROWING_SEMANTICS.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M3_BORROWING_SEMANTICS.md).

```zry
function update(): i32 {
  let score: i32 = 7;
  {
    const loan: BorrowMut<i32> = borrowMut(score);
    loan = 12;
  }
  return score;
}

export function score(): i32 {
  return update();
}
```

`borrowMut(score)` creates exclusive access without moving `score`. The lexical block marks the loan's lifetime. After the closing brace, the owner can be read again and contains the updated value.

```powershell
& $zryna run src/borrowing.zry --project-root "$workspace\tutorial-ownership" --profile data-ownership-v1 --target javascript --name borrow-js --export score
& $zryna run src/borrowing.zry --project-root "$workspace\tutorial-ownership" --profile data-ownership-v1 --target webassembly --name borrow-wasm --export score
```

Expected outputs are `javascript: i32 12` and `webassembly: i32 12`.

`Borrow<T>` is shared read access; `BorrowMut<T>` is exclusive mutable access. Borrow aliases cannot escape their admitted lexical scope.

## Common error: conflicting access

Creating `Borrow<i32>` while an overlapping `BorrowMut<i32>` is active is rejected with `ZRYNA-M3017`. End the first borrow's block before creating incompatible access. Stored or returned borrows, implicit lifetime shortening, and unrestricted reference syntax are outside this preview.

## Exercise

Explain why the final `return score` is legal but reading `score` inside the loan's block would conflict with exclusive access. Then rerun the verified example with a fresh output name.

[← Ownership](/tutorial/ownership/) · [Continue to the project →](/tutorial/project/)

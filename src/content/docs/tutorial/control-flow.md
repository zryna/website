---
title: 3. Conditions and loops
description: Use exact Boolean conditions, if, and while in Zryna 0.2.1.
---

Zryna `0.2.1` at [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446) publishes `if`, optional `else`, lexical blocks, and `while` through `control-flow-v1`. See the exact [`M2_CONTROL_FLOW_SEMANTICS.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M2_CONTROL_FLOW_SEMANTICS.md).

```zry
export function sumTo(limit: i32): i32 {
  let next: i32 = 1;
  let total: i32 = 0;
  while (next <= limit) {
    total = total + next;
    next = next + 1;
  }
  return total;
}

export function choose(enabled: bool, yes: i32, no: i32): i32 {
  if (enabled) {
    return yes;
  }
  return no;
}
```

Every condition must be exactly `bool`. A `while` reevaluates its condition on each visit. Every reachable function path must return its declared type.

Run the loop:

```powershell
& $zryna run src/control.zry `
  --project-root "$workspace\tutorial-control" `
  --profile control-flow-v1 `
  --target webassembly `
  --name sum-to-five `
  --export sumTo `
  --arg=i32:5
```

Expected output: `webassembly: i32 15`.

Run the branch with `--export choose --arg=bool:false --arg=i32:40 --arg=i32:2`; the result is `i32 2`.

## What is not supported

The 0.2.1 control-flow profile does not admit `for`, `break`, `continue`, `switch`, labels, exceptions, async control flow, recursion, or implicit truthiness. Use the supported `while` form rather than translating syntax from JavaScript mechanically.

## Common errors

- `ZRYNA-M2014` means an `if` or `while` condition was not exactly `bool`.
- `ZRYNA-M2009` covers missing, wrong, or unreachable returns.
- A loop whose condition never becomes false can hit the bounded execution deadline; it is not treated as proof that the function returns.

## Exercise

Predict and then run `sumTo(0)`, `sumTo(1)`, and `sumTo(10)` on either portable target. Why does zero skip the body?

[← Values and operators](/tutorial/values-and-operators/) · [Continue to functions and modules →](/tutorial/functions-and-modules/)

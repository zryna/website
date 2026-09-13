---
title: 2. Values and operators
description: Learn Zryna's published scalar types, bindings, and operators.
---

This lesson is verified against Zryna `0.2.1` from [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446). The exact operator semantics live in the release's [`M2_JAVASCRIPT_BACKEND.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M2_JAVASCRIPT_BACKEND.md) and matching WebAssembly backend.

Open `tutorial-control/src/scalars.zry`:

```zry
export function calculate(start: i32, step: i32): i32 {
  let total: i32 = start;
  const doubled: i32 = step * 2;
  total = total + doubled;
  return total - 1;
}

export function isAtLeast(left: i32, right: i32): bool {
  return left >= right;
}
```

## Types and bindings

- `i32` is a signed 32-bit integer. Published arithmetic wraps to its low 32 bits.
- `bool` has exactly `true` and `false`; numeric truthiness is not accepted.
- `const` creates an initialized binding that cannot be assigned again.
- `let` creates an initialized mutable binding. Assignment must keep the exact type.

The published scalar operators are unary `-`, integer `+`, `-`, `*`, signed `<`, `<=`, `>`, `>=`, and exact `===` and `!==` for equal scalar types. This preview does not admit division, remainder, coercing equality, or untyped numbers in this profile.

## Run a Boolean export

```powershell
& $zryna run src/scalars.zry `
  --project-root "$workspace\tutorial-control" `
  --profile control-flow-v1 `
  --target javascript `
  --name comparison-1 `
  --export isAtLeast `
  --arg=i32:9 `
  --arg=i32:4
```

Expected output:

```text
javascript: bool true
```

Typed arguments are strict. Use canonical forms such as `i32:-1`, `i32:0`, and `bool:false`; `01`, `+1`, fractions, and `True` are rejected.

## Common errors

- Assigning to `const` is rejected. Use `let` only when the algorithm needs reassignment.
- Assigning a `bool` to an `i32` (or the reverse) is an exact-type error; there is no implicit conversion.
- Arithmetic overflow wraps for `i32`; it does not widen to a JavaScript number.

## Exercise

Run `isAtLeast` on both targets with `left = -3` and `right = 2`. Then run it with equal values. Use new output names for every run.

[← Setup](/tutorial/setup/) · [Continue to control flow →](/tutorial/control-flow/)

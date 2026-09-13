---
title: 5. Data shapes
description: Use structs, fixed arrays, Vec, String, and exhaustive enums.
---

The `data-ownership-v1` profile in Zryna `0.2.1` at [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446) adds the published aggregate and owned-data surface. Its exact boundary is [`M3_PUBLIC_PROFILE.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M3_PUBLIC_PROFILE.md).

## Struct fields

```zry
interface Pair extends ZrynaStruct { left: i32; right: i32; }
export function score(left: i32, right: i32): i32 { const pair: Pair = Pair({ left, right }); return pair.left * 31 + pair.right; }
```

`Pair({ ... })` is the profile's nominal struct construction syntax. It is not a class constructor and does not grant methods or inheritance.

```powershell
& $zryna run src/pair.zry --project-root "$workspace\tutorial-ownership" --profile data-ownership-v1 --target javascript --name pair-1 --export score --arg=i32:2 --arg=i32:3
```

Expected output: `javascript: i32 65`.

## Fixed arrays

```zry
export function score(): i32 { const values: FixedArray<i32, 3> = FixedArray<i32, 3>([7, 11, 19]); return values[0] * 100 + values[1] * 10 + values[2]; }
```

The length is part of the type. Running `src/array.zry` as `score` returns `i32 829` on both portable targets.

## Vec

```zry
function values(): i32 { let items: Vec<i32> = Vec<i32>([7, 9]); push(items, 13); const copied: Vec<i32> = clone(items); return copied[2]; }
export function score(): i32 { return values(); }
```

`Vec<T>` is growable. `push` mutates it, indexing performs a checked access, and `clone` creates a distinct owned vector. Running `src/vec.zry` returns `i32 13`.

## String

```zry
export function text(): i32 { let first: String = "héllo"; const copy: String = clone(first); const moved: String = copy; first = "new"; const joined: String = concat(first, moved); return 17; }
```

`String` is owned UTF-8 data. The public CLI exposes only scalar entry results, so this example returns the scalar sentinel `i32 17` after completing the owned operations; it does not print the joined string.

## Enums and exhaustive matching

```zry
interface Choice extends ZrynaEnum { none: ZrynaNone; value: i32; }
export function score(value: i32): i32 { const selected: Choice = Choice.value(value); return match(selected, { "Choice.none": () => 0, "Choice.value": (item) => item * 3 }); }
```

Every declared variant has one arm. Running the supplied `src/enum.zry` wrapper with `i32:11` returns `i32 33`.

These forms are profile-specific language constructs, not universal TypeScript or npm compatibility.

## Common errors

- A Vec or fixed-array access outside its bounds produces the typed trap `zryna.trap.bounds-v1`. With `--json`, inspect `results[].outcome.kind`; a complete typed trap can still be an `ok: true` run observation.
- Owned values cannot appear in a public entry signature in 0.2.1. Keep owned work private or imported and return an `i32` or `bool` observation.
- Non-exhaustive enum matching is rejected.

## Exercise

Run the supplied `pair`, `array`, `vec`, `string`, and `enum` entrypoints on WebAssembly with fresh names. Confirm the observations `65`, `829`, `13`, `17`, and `33`.

[← Functions and modules](/tutorial/functions-and-modules/) · [Continue to ownership →](/tutorial/ownership/)

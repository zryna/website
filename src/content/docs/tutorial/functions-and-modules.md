---
title: 4. Functions and modules
description: Call private functions and import named functions from Zryna modules.
---

This lesson uses Zryna `0.2.1` source commit [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446). Module discovery is defined by [`M2_MODULE_CLOSURE.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M2_MODULE_CLOSURE.md).

`functions.zry` imports one named function and keeps a helper private:

```zry
import { triple } from "./math.zry";

function addBonus(value: i32): i32 {
  return value + 2;
}

export function score(value: i32): i32 {
  return addBonus(triple(value));
}
```

`math.zry` supplies the imported function:

```zry
export function triple(value: i32): i32 {
  return value * 3;
}
```

Parameters and return values carry exact types. `export` exposes a function from its module; only scalar entry exports can be invoked by the public CLI. Private functions remain internal.

```powershell
& $zryna run src/functions.zry `
  --project-root "$workspace\tutorial-control" `
  --profile control-flow-v1 `
  --target javascript `
  --name module-score `
  --export score `
  --arg=i32:10
```

Expected output: `javascript: i32 32`.

Imports must be explicit named imports with a relative `.zry` specifier. There are no default, wildcard, namespace, dynamic, URL, package-name, `node_modules`, or implicit-extension imports in this release.

## Common errors

- A missing or wrong-case file is rejected rather than resolved approximately.
- Cyclic module graphs are rejected.
- Calling a function with the wrong arity or exact argument types is rejected before target execution.

## Exercise

Run `score` with `i32:-4` on JavaScript and WebAssembly. Both targets should observe `i32 -10`.

[← Conditions and loops](/tutorial/control-flow/) · [Continue to data shapes →](/tutorial/data-shapes/)

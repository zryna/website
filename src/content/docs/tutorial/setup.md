---
title: 1. Setup and first run
description: Install Zryna 0.2.1 and run the verified tutorial workspace.
---

This lesson uses the [Zryna 0.2.1 prerelease](https://github.com/zryna/zryna/releases/tag/v0.2.1), built from source commit [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446). It is a Developer Preview.

## 1. Download and verify the compiler

Choose the archive for your system from the release page. The published SHA-256 values are:

- Windows x64 ZIP: `2d38dd9c09b7abcbef777fa115365f5f0b2a5670c4e39dcf9e1560f314c27aa3`
- Linux x86-64 tar.gz: `f38ab0bed4d8874f80ebd7c5c39d403f2914100ceff37dc0651af8adc5b219cc`

Authenticate the release envelope and checksum document using the release verification procedure before running an executable. The archive includes its exact Node.js runtime and frontend provider; you do not need npm, pnpm, Rust, or a separate Node installation for these lessons. See the exact [beta distribution contract](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/BETA_DISTRIBUTION.md).

After extraction, check the version:

```powershell
$zryna = 'C:\path\to\zryna-0.2.1-x86_64-pc-windows-msvc\bin\zryna.exe'
& $zryna --version
```

```text
zryna 0.2.1
```

On Linux, set `ZRYNA` to the extracted `bin/zryna` path instead.

## 2. Download the tutorial workspace

Download [zryna-tutorial-0.2.1.zip](/tutorial/zryna-tutorial-0.2.1.zip) and extract it outside the compiler installation. It contains two package-locked projects:

```text
zryna-tutorial-0.2.1/
├── tutorial-control/
└── tutorial-ownership/
```

The release compiler authenticates each declared source file before compilation. Keep the supplied `zryna.package.json` and `zryna.lock.json` files with their project. The starter is deliberately ready to run; editing a declared source without updating its package identity is rejected instead of silently compiling different bytes.

Set the extracted workspace path:

```powershell
$workspace = 'C:\path\to\zryna-tutorial-0.2.1'
```

## 3. Run the first program

```powershell
& $zryna run src/scalars.zry `
  --project-root "$workspace\tutorial-control" `
  --profile control-flow-v1 `
  --target javascript `
  --name first-run `
  --export calculate `
  --arg=i32:5 `
  --arg=i32:4
```

Expected output:

```text
javascript: i32 12
```

The compiler calculated `5 + (4 × 2) - 1`. A successful run also publishes an authenticated manifest and JavaScript artifact under `tutorial-control/.zryna/out/first-run.run/`.

Try the same verified program through core WebAssembly. Output bundles are create-only, so use a new name:

```powershell
& $zryna run src/scalars.zry `
  --project-root "$workspace\tutorial-control" `
  --profile control-flow-v1 `
  --target webassembly `
  --name first-run-wasm `
  --export calculate `
  --arg=i32:5 `
  --arg=i32:4
```

Expected output: `webassembly: i32 12`.

## Common errors

- `ZRYNA-C1009` means the `--name` already exists. Preserve the existing result and choose a fresh name.
- `ZRYNA-P4004` means a package file is absent, changed, or unsafe. Extract a fresh tutorial workspace instead of patching a lock by guesswork.
- Windows native execution is not available. Use `javascript` or `webassembly`; see the exact [0.2.1 CLI boundary](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/CLI.md).

## Exercise

Run `calculate` with `--arg=i32:10 --arg=i32:3`. Predict the result before running it. Use a fresh name such as `values-exercise-1`.

[Continue to values and operators →](/tutorial/values-and-operators/)

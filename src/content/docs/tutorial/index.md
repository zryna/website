---
title: Zryna tutorial
description: Learn the Zryna 0.2.1 Developer Preview step by step with verified programs.
---

This tutorial is a guided path through the published [Zryna 0.2.1 prerelease](https://github.com/zryna/zryna/releases/tag/v0.2.1). Every runnable example was checked with that immutable compiler on both the JavaScript and core WebAssembly targets.

> **Release anchor:** Zryna `0.2.1`, source commit [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446). This is a Developer Preview, not a production-ready or stable release.

## What you will build

Work through the lessons in order:

1. [Set up and run your first program](/tutorial/setup/)
2. [Use values, variables, types, and operators](/tutorial/values-and-operators/)
3. [Make decisions and repeat work](/tutorial/control-flow/)
4. [Split logic into functions and modules](/tutorial/functions-and-modules/)
5. [Model data with structs, arrays, Vec, String, and enums](/tutorial/data-shapes/)
6. [Understand moves and explicit clones](/tutorial/ownership/)
7. [Borrow a value for a limited scope](/tutorial/borrowing/)
8. [Finish a small study-score project](/tutorial/project/)

Use this list as a progress checklist. Progress is intentionally local to you: this static documentation does not track an account or store browser data. To restart, return to this page; to rerun a compiler command, choose a fresh `--name` as explained in setup.

## What this preview supports

The lessons use the published `control-flow-v1` and `data-ownership-v1` profiles. They teach only observed syntax from the exact release source, including [`M2_CONTROL_FLOW_SEMANTICS.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M2_CONTROL_FLOW_SEMANTICS.md) and [`M3_PUBLIC_PROFILE.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M3_PUBLIC_PROFILE.md).

Zryna does **not** promise classes, constructors, inheritance, arbitrary TypeScript syntax, npm compatibility, browser execution, or Windows native execution in 0.2.1.

## About Compile and Run in the browser

These pages do not simulate compiler output. The website is currently static, and compiling to WebAssembly is different from running the compiler safely inside a browser. A capability-restricted playground with real diagnostics and observations is tracked in [zryna/zryna#410](https://github.com/zryna/zryna/issues/410). Until that lands, each lesson gives an authentic local compiler command and its verified output.

[Start with setup →](/tutorial/setup/)

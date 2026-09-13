---
title: 8. Build a study-score project
description: Combine modules, functions, a loop, and a Boolean decision in one small program.
---

The final project uses the Zryna `0.2.1` `control-flow-v1` contract from [`841c8aee901782c9f7bf442bfe8eb2fe6b7f6446`](https://github.com/zryna/zryna/tree/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446). Its supported behavior is defined by [`M2_CONTROL_FLOW_SEMANTICS.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M2_CONTROL_FLOW_SEMANTICS.md) and [`M2_MODULE_CLOSURE.md`](https://github.com/zryna/zryna/blob/841c8aee901782c9f7bf442bfe8eb2fe6b7f6446/docs/M2_MODULE_CLOSURE.md).

The project awards `1 + 2 + ... + sessions` study points and adds five points for a perfect week.

`project.zry`:

```zry
import { addPerfectBonus, sumTo } from "./study.zry";

export function finalScore(sessions: i32, perfect: bool): i32 {
  const studyPoints: i32 = sumTo(sessions);
  return addPerfectBonus(studyPoints, perfect);
}
```

`study.zry`:

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

export function addPerfectBonus(score: i32, perfect: bool): i32 {
  if (perfect) {
    return score + 5;
  }
  return score;
}
```

Run four sessions with the bonus:

```powershell
& $zryna run src/project.zry `
  --project-root "$workspace\tutorial-control" `
  --profile control-flow-v1 `
  --target javascript `
  --name study-score-js `
  --export finalScore `
  --arg=i32:4 `
  --arg=bool:true
```

Expected output: `javascript: i32 15` because `1 + 2 + 3 + 4 + 5 = 15`.

Run the same invocation with `--target webassembly` and a fresh name. It also returns `i32 15`.

## Final exercises

1. Predict the result for four sessions with `bool:false`, then run it. Expected: `i32 10`.
2. Predict the result for six sessions with `bool:true`. Check it on both targets.
3. Use `--json` and find the typed outcome and the committed manifest path. Do not treat exit status alone as the program's scalar result.

## Where to go next

- Use the [compiler reference](/reference/compiler/next/) for normative detail.
- Check [compiler status](/reference/compiler-status/) before relying on a feature.
- Follow [zryna/zryna#410](https://github.com/zryna/zryna/issues/410) for the future capability-restricted browser playground.

You have completed the current tutorial. Return to the [tutorial overview](/tutorial/) to review the checklist.

[← Borrowing](/tutorial/borrowing/) · [Tutorial overview](/tutorial/)

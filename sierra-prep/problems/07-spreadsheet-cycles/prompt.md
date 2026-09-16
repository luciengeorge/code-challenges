# 7. Circular references in a spreadsheet

**Evidence: strongest.** This is the most-reported Sierra phone screen. One candidate got it near
verbatim: *"Imagine an Excel-style spreadsheet where cells can reference other cells. How would you
detect whether there's a circular reference?"* They described it as a standard cycle-detection
problem dressed up as an Excel question, and said the interviewer added no extra constraints after.

**Budget:** 45 min. Read only this file. Spoiler at the bottom.

## Setup

A sheet maps cell names to contents. A formula starts with `=` and names other cells.

```ts
type Sheet = Record<string, string>

const sheet: Sheet = {
  A1: '5',
  A2: '=A1+B1',
  B1: '=C1*2',
  C1: '=A2',        // A2 -> B1 -> C1 -> A2
}
```

Write `hasCycle(sheet: Sheet): boolean`.

## Ask these before writing code

- What does a formula look like? Settle on something you can parse in one line and move on. Do not
  spend twenty minutes on an expression parser; say out loud that you are treating the formula as a
  bag of cell references and the interviewer will agree.
- A cell that references a cell that does not exist. Error, or treat as empty?
- A cell that references itself, `A1: '=A1'`. That is a cycle of length one.
- Are references case-insensitive? Is `a1` the same cell as `A1`?
- How big can the sheet be? This decides recursion versus an explicit stack.
- Does a cell referenced twice in one formula (`=A1+A1`) change anything?

## Follow-ups the interviewer will reach for

1. **Which cells.** Do not return a boolean. Return the actual cycle, `['A2', 'B1', 'C1', 'A2']`, so
   the person looking at the spreadsheet knows which links to cut. This is the follow-up that
   separates a memorised answer from an understood one.
2. **Evaluate it.** Compute every cell's value in dependency order, and report `#CIRCULAR!` for the
   cells caught in or downstream of a cycle. Notice you already have the order.
3. **Recalculate on edit.** The user changes `A1`. Which cells need recomputing, and which can you
   leave alone? Do not recompute the sheet.
4. **Ranges.** `=SUM(B1:B5)` names five cells at once. What changes, and what does not?

## What this is probing

Whether you hear "cells reference other cells" and see a directed graph. Then whether you know the
difference between "visited" and "on the current path": a plain visited set finds a cycle that is not
there the moment two cells reference the same third cell. Colour marking (white, grey, black) or an
explicit recursion stack is the answer, and being able to explain *why* a single visited set is wrong
is worth more than the code.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

Parse each formula to its referenced cells with `/[A-Z]+\d+/g`. DFS with three states: unvisited,
in-progress, done. Hitting an in-progress node is a cycle; hitting a done node is a diamond, not a
cycle. For the path, keep the current stack and slice from the first occurrence of the repeated node.
Kahn's algorithm also works and gives you the evaluation order for follow-up 2 directly. O(V + E).
</details>

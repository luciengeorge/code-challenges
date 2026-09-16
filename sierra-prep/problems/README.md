# Problems

Nine simulations, ranked by how much evidence there is that Sierra actually asks this shape. Each
directory holds three files:

- `prompt.md` — the only thing you open when the timer starts. Stop at the spoiler.
- `starter.ts` — the types and signatures with a full failing test suite. This is your Coderpad tab.
- `solution.ts` — the reference, every follow-up implemented. Read it after, never during.

## Ranked by evidence

Evidence is from two first-hand write-ups, a Blind comment, and Exponent's Sierra question bank,
researched 2026-09-16. See `coding-challenges/sierra-dsa.md` in the Obsidian vault for the sourcing.

| # | Directory | Evidence | What you build | Pattern |
|---|---|---|---|---|
| 7 | `07-spreadsheet-cycles` | **Strongest.** Asked near verbatim, multiple sources | Detect circular references between spreadsheet cells | Three-colour DFS, cycle path |
| 8 | `08-flaky-api-retry` | **Strong.** Two independent sources | Retry a flaky endpoint with backoff and timeouts | Async control flow, injected clock |
| 9 | `09-batch-resolution` | **Strong.** First-hand, part two of the same screen | Resolve product ids into objects without N+1 | Map lookup, chunking, bounded concurrency |
| 10 | `10-json-to-linked-list` | **Strong.** First-hand; candidate failed on typing, not the algorithm | Build and manipulate a linked list from untrusted JSON | Type predicates, pointer work, Floyd |
| 2 | `02-step-dependencies` | Adjacent to #7, same algorithm | Order steps by what depends on what | Kahn, parallel batches, longest path |
| 11 | `11-word-search` | Moderate. Listed in the question bank | Find a word in a grid of letters | Backtracking, trie for many words |
| 1 | `01-session-rollup` | Moderate. Matches the "transform response objects" reports | Roll an event stream up per conversation | Map grouping, dedupe, heap for top-k |
| 3 | `03-layered-config` | Weak. Matches "nested catalog traversal" reports | Merge config layers and query by path | Recursion over unknown-shaped data |
| 6 | `06-kb-autocomplete` | Weak. No direct report | Suggest articles as a support agent types | Trie, top-k, or sorted array + binary search |

`archive/` holds two problems built before the research: usage quotas and agent availability. Good
problems, no evidence Sierra asks them. They still run if you want the reps.

## A self-timed session

Set a timer for 45 minutes and open `prompt.md`, nothing else, talking out loud to an empty room.
Give the first ten minutes to restating the problem and answering the scoping questions the prompt
lists, out loud, rather than reading past them. Then open `starter.ts` and run it: every check fails,
and each failure is one behaviour you owe.

```sh
bun run problems/07-spreadsheet-cycles/starter.ts
```

At 40 minutes stop coding, even mid-function, and talk through the follow-ups, because that is where
the signal is. Sierra's screen is explicitly one question with variations layered on, so the
follow-ups are not a bonus round. Only then open `solution.ts`, and read the follow-up sections too.

If you only have time for three, do 7, 8 and 9 in that order.

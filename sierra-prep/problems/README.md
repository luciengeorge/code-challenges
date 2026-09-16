# Problems

Six Sierra-shaped simulations. Each directory holds three files:

- `prompt.md` — the only thing you open when the timer starts. Stop at the spoiler.
- `starter.ts` — the types and signatures with a full failing test suite. This is your Coderpad tab.
- `solution.ts` — the reference, every follow-up implemented. Read it after, never during.

| # | Directory | What you build | Pattern |
|---|---|---|---|
| 1 | `01-session-rollup` | Roll a raw event stream up into one summary per conversation | Map grouping, dedupe, stable sort, heap for top-k |
| 2 | `02-step-dependencies` | Order the steps of an agent skill by what depends on what | Topological sort, Kahn's algorithm, longest path on a DAG |
| 3 | `03-layered-config` | Merge platform, org, agent and override config into one | Recursion over unknown-shaped data, path parsing |
| 4 | `04-usage-quotas` | Cap a customer at N agent actions per rolling window | Sliding window over a queue, LRU eviction, token bucket |
| 5 | `05-agent-availability` | Find the earliest free slot for a handoff to a human | Interval merging, sweep line |
| 6 | `06-kb-autocomplete` | Suggest help-centre articles as a support agent types | Trie, top-k heap, binary search over a sorted array |

The pattern column is a one-line spoiler. Cover it if you would rather find the structure yourself.

## A self-timed session

Set a timer for 45 minutes and open `prompt.md`, nothing else, talking out loud to an empty room.
Give the first ten minutes to restating the problem and working through the scoping questions the
prompt lists, saying your answer to each rather than reading past them. Then open `starter.ts` and
run it: every check fails, and each failure is one behaviour you owe. Implement until they pass,
rerunning after each change:

```sh
bun run problems/04-usage-quotas/starter.ts
```

At 40 minutes stop coding, even mid-function, and talk through the follow-ups, because that is where
the signal is. Only then open `solution.ts`, and read the follow-up sections too, not just the core.

# Sierra AI interview prep (TypeScript)

45 minutes, Coderpad, one question with variations. Data structures and algorithms, but framed as
something you would hit at work. No AI assist in the room. Google is allowed.

## Run anything here

```sh
bun run toolbox/min-heap.ts        # fastest
npx tsx drills/01-objects-and-maps.ts
node --experimental-strip-types problems/01-session-rollup/solution.ts
```

No install, no package.json, no test framework. `lib/check.ts` is a 40-line harness that prints
`ok` / `FAIL` and sets a non-zero exit code.

## What's here

| Directory | What it is | How to use it |
|---|---|---|
| `toolbox/` | The structures JS does not hand you: heap, deque, trie, union-find, LRU, binary search, graph algorithms | Read one, close it, re-type it from memory, run it, diff |
| `drills/` | Object, array, nested-data and TypeScript reps, with the footguns demonstrated | Same loop, 15 minutes a day |
| `problems/` | Six Sierra-shaped interview simulations, each with a `prompt.md`, a failing `starter.ts` and a `solution.ts` | Set a 45-minute timer, open only `prompt.md` |

## The 45 minutes

| Minutes | What you are doing |
|---|---|
| 0-5 | Restate the problem in your own words. Ask the scoping questions. Write down the input and output types. |
| 5-10 | Work one small example by hand, out loud. Name the edge cases you found doing it. |
| 10-15 | State the approach and its complexity before writing code. Get a nod. |
| 15-35 | Code it. Narrate what you are doing, not what the syntax means. |
| 35-40 | Run your own tests. Walk the example through the code if you cannot run it. |
| 40-45 | Follow-ups. This is where the signal is. |

The two failure modes are silence and coding at minute 2. Sierra's email says outright that they want
you to scope and plan for edge cases with the interviewer. Treat the first ten minutes as part of the
answer, not overhead.

## Questions worth asking on almost any problem

- What are the realistic sizes? n = 100 and n = 10^8 are different problems.
- Is the input sorted? Can I sort it, or does the original order matter?
- Duplicates? Nulls? Empty input? A single element?
- Is this called once, or on a hot path for every request?
- Do I have to preserve the input, or may I mutate it?
- Exact answer, or is approximate fine if it is cheaper?
- One process, or many? (Say it even when the answer is "assume one".)

## Phrase to structure

| When you hear | Reach for |
|---|---|
| "top k", "k most", "k closest" | Heap of size k, O(n log k) |
| "order these by what depends on what" | Topological sort, Kahn's algorithm |
| "has it been seen", "deduplicate" | Set, or Map when you need the value too |
| "group by", "per customer", "roll up" | Map accumulator, one pass |
| "overlapping", "merge", "free slot", "peak concurrent" | Sort by start, sweep |
| "prefix", "autocomplete", "starts with" | Trie, or sort plus binary search |
| "rolling window", "last N minutes", "at most N in a row" | Sliding window, deque of indices |
| "most recent", "evict", "bounded memory" | LRU over a Map |
| "are these the same group", "merge accounts" | Union-find |
| "shortest", "fewest steps" | BFS. Only reach for Dijkstra when edges have weights |
| "how many ways", "minimum cost to" | DP. Define the state out loud before coding |
| "find the smallest X that works" | Binary search the answer, not the array |

## TypeScript and JavaScript footguns

The ones that actually cost people offers:

- `[10, 9, 1].sort()` gives `[1, 10, 9]`. It sorts as strings. Always pass `(a, b) => a - b`.
- `sort`, `reverse`, `splice`, `fill` mutate. `toSorted`, `toReversed`, `slice`, `with` do not.
- Spread and `Object.assign` are shallow. Nested objects stay shared.
- Object keys that look like integers come out first and in numeric order. Use a `Map` when order
  matters.
- `Array.shift()` is O(n). A queue built on it turns an O(n) BFS into O(n^2). Use an index pointer or
  the `Deque` in `toolbox/`.
- `new Array(3).fill([])` puts the *same* array in all three slots. Use `Array.from({length: 3}, () => [])`.
- `??` and `||` differ on `0` and `''`. This is the bug in half of all default-value code.
- Map keys compare by reference for objects. `map.set({a: 1}, x)` can never be read back.
- `JSON.parse(JSON.stringify(x))` loses Dates, Maps, Sets, undefined, and dies on cycles.
  `structuredClone` handles most of it.
- No integer type. `2**53` is where safety ends. `/` gives floats, so you need `Math.floor(a / b)`.
  `a / b | 0` is **not** the same thing: it truncates toward zero, so `-7 / 2 | 0` is `-3` where
  `Math.floor(-7 / 2)` is `-4`, and `| 0` also wraps anything past 2^31. Use `>> 1` for halving a
  non-negative index and `Math.floor` everywhere else.

## What Coderpad gives you

Node with TypeScript. You get `Map`, `Set`, `Array`, `Object`, `structuredClone`, `BigInt`, regex.
You do **not** get a heap, a deque, a sorted map, `defaultdict`, `Counter`, `bisect`, or `itertools`.
That is exactly the gap `toolbox/` fills. Being able to drop a 20-line heap in without breaking
conversation is worth more than any single algorithm.

## A two-week routine

- **Every day, 15 min:** one drill file. Read it, close it, re-type the helpers from memory, run it.
- **Every day, 20 min:** one toolbox file, same loop. Rotate through all seven twice.
- **Three times a week, 45 min:** one problem, timed, `prompt.md` only, talking out loud to an empty
  room. Then read `solution.ts` and note what you missed, especially in the follow-ups.
- **Day before:** re-type the heap, the deque and Kahn's algorithm cold. Nothing new.

## Say these out loud in the room

- "Let me restate the problem to make sure I have it."
- "Before I code, here is the approach and the complexity. Does that sound right to you?"
- "I am going to assume X. Tell me if that is wrong."
- "This is O(n log n) because of the sort. I could get it to O(n) with a heap if the k is small."
- "That works but it mutates the input. Do you want me to keep the original?"
- "Let me run through the example by hand before I trust it."

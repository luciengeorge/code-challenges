# 2. Resolving step dependencies

**Budget:** 45 min. Read only this file before you start. Spoiler at the bottom.

## Setup

A Sierra agent skill is a set of steps. Each step names the steps it needs done first. Given the
config, work out what order to run them in.

```ts
type Step = {
  id: string
  dependsOn?: string[]
  durationMs?: number        // only used in follow-up 4
}
```

Write `resolveOrder(steps: Step[]): string[]` returning a valid execution order.

## Ask these before writing code

- Can two valid orders exist? Yes, so pick a deterministic tie-break (alphabetical) and say why:
  a non-deterministic build order is a debugging nightmare.
- What if a step depends on an id that does not exist? Throw, or drop it? Make a call and be consistent.
- What if a step depends on itself? That is a cycle of length 1.
- Duplicate ids in the input?
- Empty input returns `[]`, not an error.

## Follow-ups the interviewer will reach for

1. **Cycles.** Do not just return null. Return the actual cycle path, `['a', 'b', 'c', 'a']`, because
   the person debugging this needs to know which edges to cut.
2. **Parallel batches.** Return `string[][]` where every step in batch `i` can run concurrently once
   batch `i - 1` is done. This is the version the scheduler actually wants.
3. **Subset.** Run only what a given target step needs. `resolveFor(steps, 'publish')` returns the
   transitive dependencies plus the target, in order, and nothing else.
4. **Critical path.** Each step has a `durationMs`. With unlimited parallelism, what is the minimum
   wall-clock time for the whole skill, and which chain of steps determines it?

## What this is probing

Whether you recognise a topological sort behind a business description, and whether you do it with
Kahn's algorithm (indegree queue) or DFS post-order. Kahn's gives you the parallel batches almost free,
which is why it is the one worth having in your fingers. Follow-up 4 is longest-path on a DAG, which is
only easy because you already have a topological order, and saying that out loud is the point.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

Build `Map<string, string[]>` of dependents plus a `Map<string, number>` of indegrees. Seed a queue
with indegree 0 (sorted, for determinism), pop, decrement, push newly-zeroed. If the output is shorter
than the input, there is a cycle. Batches: instead of popping one at a time, drain the whole current
queue as one level. Critical path: `finish[v] = max(finish[u] for u in deps) + duration[v]` in topo
order, then walk the parent pointers back from the max.
</details>

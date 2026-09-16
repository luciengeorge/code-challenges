# 10. JSON into a linked list

**Evidence: strong, and a warning.** A Blind candidate's Sierra screen was *"calling an API getting
json array and creating a linked list"*. They failed it, and not on the algorithm: on JSON parsing and
type handling. Their advice was blunt, *"you have to know your language well (types etc.) to make sure
Json parsing is not artificial making you stuck"*. That is a TypeScript problem, not a data structures
problem, and it is why this one is here.

**Budget:** 45 min. Read only this file. Spoiler at the bottom.

## Setup

An endpoint returns a JSON array of events. Build a linked list from it and work with the list.

```ts
// What actually comes back. Untrusted shape.
type RawEvent = unknown

type EventNode = {
  id: string
  at: number
  kind: 'message' | 'tool_call' | 'handoff'
  next: EventNode | null
}

function buildList(raw: unknown): EventNode | null
```

The payload is real-world shaped: some records are missing fields, `at` may be an ISO string rather
than a number, `kind` may be something you do not recognise, and the array may be wrapped in an
envelope like `{ data: [...] }`.

## Ask these before writing code

- Do I validate, or do I trust the payload? Say which, and know that `JSON.parse` gives you `any` and
  TypeScript will happily let you walk off a cliff from there.
- Malformed record: skip it, or fail the whole batch? Different answers for a UI and for a billing job.
- Are events already in order, or do I sort by `at` first?
- Duplicate ids?
- Empty array returns null, not an empty node.

## Follow-ups the interviewer will reach for

1. **Reverse it.** In place, iteratively, three pointers. If you have not written this in a year,
   write it now, because it will be asked and hesitating on it reads badly.
2. **Detect a cycle.** Someone hands you a list whose tail points back into the middle. Floyd's
   tortoise and hare, O(1) space. Then: find the node where the loop starts.
3. **Merge two lists.** Two sorted event streams into one. Iterative, with a dummy head, and say why
   the dummy head removes the special case.
4. **Back to JSON.** Serialise the list. Notice that the naive answer recurses forever on `next`, and
   that a cycle turns `JSON.stringify` into a thrown error.

## What this is probing

Half of it is classic pointer work, which you either have in your fingers or you do not. The other
half, the half the Blind candidate lost on, is whether you can move from `unknown` to a typed value
without either lying to the compiler with `as` or drowning in guards. Write a type predicate. Say the
words "type predicate" out loud.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

A `isRawEvent(value: unknown): value is RawEventShape` predicate doing the `typeof` checks once, then
a normalise step that coerces `at` and defaults `kind`. Build with a dummy head and a tail pointer,
appending in one pass rather than traversing to the end each time, which is the O(n^2) trap. Reverse:
`prev = null; while (node) { const next = node.next; node.next = prev; prev = node; node = next }`.
</details>

# 5. Human agent availability

**Budget:** 45 min. Read only this file before you start. Spoiler at the bottom.

## Setup

When the AI agent escalates, the conversation goes to a human. Schedule that handoff.

```ts
type Busy = { agentId: string; start: number; end: number }   // epoch ms, half-open [start, end)
```

Given everyone's busy intervals and a required duration, find the earliest moment at or after `from`
when some agent is free for the whole duration:

```ts
earliestSlot(busy: Busy[], from: number, durationMs: number): { agentId: string; start: number } | null
```

## Ask these before writing code

- Half-open or closed intervals? Decide before you write a single comparison, because every off-by-one
  in this problem lives there. A meeting ending at 10:00 and one starting at 10:00 do not overlap.
- Are an agent's own intervals sorted, non-overlapping? Do not assume it. Overlapping busy blocks for
  the same agent are normal if two systems both booked them.
- Zero-length intervals. Zero duration requests.
- Is there an upper bound on time, or can a slot run to infinity at the end of the day?
- If two agents are free at the same instant, which one wins? Pick a deterministic rule.

## Follow-ups the interviewer will reach for

1. **Working hours.** The slot must sit inside the agent's shift, and shifts differ per agent. Treat
   the outside-of-shift time as busy and notice the problem does not change shape at all.
2. **Peak staffing.** Ignoring who is who, what is the maximum number of conversations in progress at
   once, and when? Ops sizes the team off this number.
3. **Scale.** 5,000 agents, 200 intervals each, and this is called on every escalation. What do you
   precompute, and what does that cost you when a booking changes?
4. **Book it.** Now `earliestSlot` must also reserve the slot, so two concurrent escalations never get
   the same agent. What changes?

## What this is probing

Interval merging is the pattern, but the tell is whether you sort once and sweep, or write nested
loops. Follow-up 2 is the sweep line: +1 at every start, -1 at every end, sort the endpoints, running
max. If you sort ends before starts at equal timestamps you get the half-open answer, which is almost
always the one they want, and being able to explain why is better than getting it right by luck.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

Per agent: sort intervals by start, merge overlaps in a single pass, then walk the gaps from `from`
looking for the first gap of at least `durationMs`. Take the minimum start across agents. O(n log n).
Sweep line for peak: flatten to `[time, +1 | -1]`, sort by time with `-1` first on ties, running sum,
track the max. A min-heap over end times is the equivalent formulation and is worth mentioning.
</details>

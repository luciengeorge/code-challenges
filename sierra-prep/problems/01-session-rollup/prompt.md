# 1. Conversation session rollup

**Budget:** 45 min. Read only this file before you start. Spoiler at the bottom.

## Setup

Every action an AI agent takes during a customer conversation emits an event onto a queue. You are
building the reporting job that turns that raw stream into something the support ops team can read.

```ts
type AgentEvent = {
  eventId: string
  conversationId: string
  ts: number                                  // epoch ms
  type: 'message' | 'tool_call' | 'handoff' | 'resolved'
  actor: 'customer' | 'agent'
  payload?: Record<string, unknown>           // tool_call has { name: string }
}
```

Given an array of events, return one summary per conversation:

```ts
type Summary = {
  conversationId: string
  startedAt: number
  endedAt: number
  durationMs: number
  messageCount: number                        // messages only, both actors
  customerMessages: number
  toolCalls: string[]                         // tool names, in the order first called
  handedOff: boolean                          // a 'handoff' event occurred
  resolved: boolean                           // a 'resolved' event occurred
}
```

Summaries sorted by `startedAt` ascending.

## Ask these before writing code

- Are events sorted by `ts`? (No. Say it out loud and decide: sort once, or single pass with min/max.)
- Can events repeat? The queue is at-least-once, so yes, `eventId` is the dedupe key.
- Can two events share a timestamp? Yes. So what is the tie-break for `toolCalls` order, and is your
  sort stable?
- What is a conversation with zero events, or one event? `durationMs` of 0 is fine, say so.
- Is `payload.name` guaranteed present on a `tool_call`? Assume yes, but do not crash if not.

## Follow-ups the interviewer will reach for

1. **Inactivity split.** A conversation with a gap longer than 30 minutes between consecutive events
   should be reported as two separate sessions, keyed `conv-1#0`, `conv-1#1`. Does your shape change?
2. **Top tools.** Return the `k` most-called tool names across all conversations, ties broken
   alphabetically. Do it without fully sorting the tool counts. What is the complexity now?
3. **Streaming.** The real input is 400 million events, delivered as an `AsyncIterable`, not an array.
   Which fields can you still compute in one pass with bounded memory? Which cannot you, and what
   would you do instead?
4. **Percentiles.** Ops want the median conversation duration. Exact, then approximate with bounded
   memory. What do you give up?

## What this is probing

Hash-map grouping, whether you mutate an accumulator or rebuild objects, stable sorting, and whether
you reach for a heap the moment you hear "top k". The streaming follow-up is the one that separates
people: the answer is that counters and min/max fold fine, but "in the order first called" needs a
per-conversation set, so you bound it or accept the memory.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

`Map<string, Summary>` built in one pass after dedupe via a `Set` of eventIds, then
`[...map.values()].sort((a, b) => a.startedAt - b.startedAt)`. Top-k is a size-k min-heap over counts,
O(n log k). The session split is a sort-then-scan per conversation, O(n log n).
</details>

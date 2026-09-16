# 4. Usage quotas

**Budget:** 45 min. Read only this file before you start. Spoiler at the bottom.

## Setup

Every customer on the platform gets a cap on agent actions: at most `limit` actions in any rolling
window of `windowMs`. Build the thing that answers the question on the hot path.

```ts
class QuotaLimiter {
  constructor(limit: number, windowMs: number)
  allow(customerId: string, now: number): boolean    // true if the action may proceed
}
```

`now` is injected rather than read from `Date.now()`. Ask why that matters, or better, do it and say
why: the tests need a fake clock.

## Ask these before writing code

- Rolling window, or fixed buckets? A fixed one-minute bucket lets a customer spend the whole quota at
  59s and again at 61s. Does that matter here?
- Is `now` monotonic across calls? Assume yes, but know what breaks if not.
- Is this one process or many? A single in-memory map is wrong for a fleet, and saying so early is the
  right instinct. Then build the single-process one anyway.
- What do we return on a rejection? Just false, or also "retry after"?

## Follow-ups the interviewer will reach for

1. **Memory.** Ten million customers, most idle. Your per-customer array of timestamps is now the
   problem. Bound it. What do you evict, and when?
2. **Approximate.** Show the sliding-window-counter approximation: two fixed buckets, weighted by how
   far into the current bucket you are. One number per customer instead of `limit` numbers. What
   accuracy do you give up, and in which direction does the error go?
3. **Bursts.** Product wants a steady rate of 10/sec but tolerance for a burst of 100. That is a token
   bucket, not a window. Write it. Notice it is O(1) memory and needs no list at all.
4. **Tiers and multiple limits.** Free tier 100/day and 10/min at the same time. Compose the checks
   without duplicating the structure.

## What this is probing

Choosing a data structure against a real constraint rather than reciting one. The deque of timestamps
is the obvious first answer and it is fine, but the interesting conversation is the memory follow-up:
you need eviction, which is an LRU, which you should already have in your fingers. Token bucket is the
"oh, that is much simpler" moment and it is worth getting there.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

`Map<string, Deque<number>>`; on `allow`, drop timestamps `<= now - windowMs` from the front, compare
size to limit, push `now` if allowed. O(1) amortised. Memory fix: wrap the map in an LRU with a cap,
and note that evicting an entry is safe in the permissive direction. Token bucket: store `tokens` and
`lastRefill` per customer, refill `(now - lastRefill) * rate` capped at burst, spend one if available.
</details>

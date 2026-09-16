import { check, checkThrows, suite } from '../../lib/check'

// Decisions made up front, because every comparison below depends on them:
// - Rolling window, not fixed buckets. A fixed bucket lets a customer spend the whole quota at 59s
//   and again at 61s, which is twice the intended rate for a full window.
// - The window is half-open: a hit at exactly `now - windowMs` has expired.
// - `now` is injected so the tests can drive a fake clock. Assumed monotonic; see the edge tests for
//   what a backwards clock does.
// - A rejected request is not recorded, so being rate limited does not extend the block.
// - One process. A fleet needs shared state (Redis INCR with a TTL, or a token bucket per node with
//   a fraction of the limit); say that out loud, then build the single-process one.

// Minimal FIFO queue: an array plus a head index, so removing from the front is amortised O(1)
// instead of the O(n) that Array.shift costs.
class Queue<T> {
  private items: T[] = []
  private head = 0

  size(): number {
    return this.items.length - this.head
  }

  peek(): T | undefined {
    return this.items[this.head]
  }

  push(value: T): void {
    this.items.push(value)
  }

  shift(): T | undefined {
    if (this.head >= this.items.length) return undefined

    const value = this.items[this.head]
    this.head++
    // Compact once the dead prefix is most of the array, so memory stays proportional to size().
    if (this.head > 32 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head)
      this.head = 0
    }
    return value
  }
}

// Time: O(1) amortised per allow; space: O(customers * limit) timestamps.
export class QuotaLimiter {
  private readonly hits = new Map<string, Queue<number>>()

  constructor(private readonly limit: number, private readonly windowMs: number) {
    if (limit < 0) throw new RangeError('limit must be >= 0')
    if (windowMs <= 0) throw new RangeError('windowMs must be > 0')
  }

  allow(customerId: string, now: number): boolean {
    let window = this.hits.get(customerId)
    if (!window) {
      window = new Queue<number>()
      this.hits.set(customerId, window)
    }

    // Half-open window: drop everything at or before now - windowMs.
    const cutoff = now - this.windowMs
    while (window.size() > 0 && (window.peek() as number) <= cutoff) {
      window.shift()
    }

    if (window.size() >= this.limit) return false
    window.push(now)
    return true
  }
}

// ---- Follow-up 1: bounded memory ----

// Ten million customers, most idle, is ten million queues. Cap the map and evict the least recently
// used customer. Losing a customer's history is wrong in the permissive direction only: they get a
// fresh window, never a stricter one. That is the right way round for a quota.
// Time: O(1) amortised per allow; space: O(maxCustomers * limit).
export class BoundedQuotaLimiter {
  private readonly hits = new Map<string, Queue<number>>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxCustomers: number
  ) {}

  allow(customerId: string, now: number): boolean {
    const window = this.touch(customerId)

    const cutoff = now - this.windowMs
    while (window.size() > 0 && (window.peek() as number) <= cutoff) {
      window.shift()
    }

    if (window.size() >= this.limit) return false
    window.push(now)
    return true
  }

  size(): number {
    return this.hits.size
  }

  private touch(customerId: string): Queue<number> {
    const existing = this.hits.get(customerId)
    if (existing) {
      // A Map iterates in insertion order, so delete-then-set moves the key to the back and the
      // first key is always the least recently used. That is the whole LRU.
      this.hits.delete(customerId)
      this.hits.set(customerId, existing)
      return existing
    }

    const fresh = new Queue<number>()
    this.hits.set(customerId, fresh)
    if (this.hits.size > this.maxCustomers) {
      const oldest = this.hits.keys().next().value as string
      this.hits.delete(oldest)
    }
    return fresh
  }
}

// ---- Follow-up 2: sliding window counter ----

type Buckets = { bucket: number, current: number, previous: number }

// Two counters per customer instead of `limit` timestamps. The previous bucket is weighted by how
// much of it still falls inside the window, which assumes its hits were spread evenly. If they were
// bunched early we over-count and reject requests we should have allowed; if they were bunched late
// we under-count and let too many through. The error is bounded by the previous bucket's count.
// Time: O(1) per allow; space: O(customers), three numbers each.
export class ApproxQuotaLimiter {
  private readonly state = new Map<string, Buckets>()

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(customerId: string, now: number): boolean {
    const bucket = Math.floor(now / this.windowMs)
    const entry = this.rotate(customerId, bucket)

    const elapsed = (now - bucket * this.windowMs) / this.windowMs
    const estimate = entry.previous * (1 - elapsed) + entry.current
    if (estimate >= this.limit) return false

    entry.current++
    return true
  }

  private rotate(customerId: string, bucket: number): Buckets {
    const entry = this.state.get(customerId)
    if (!entry) {
      const fresh = { bucket, current: 0, previous: 0 }
      this.state.set(customerId, fresh)
      return fresh
    }
    if (entry.bucket === bucket) return entry

    entry.previous = entry.bucket === bucket - 1 ? entry.current : 0
    entry.current = 0
    entry.bucket = bucket
    return entry
  }
}

// ---- Follow-up 3: token bucket ----

// A steady rate with a tolerated burst is not a window at all. Two numbers per customer, no list,
// and the burst size is the only thing the customer can spend in one instant.
// Time: O(1) per allow; space: O(1) per customer.
export class TokenBucket {
  private readonly state = new Map<string, { tokens: number, lastRefill: number }>()

  constructor(private readonly ratePerMs: number, private readonly burst: number) {}

  allow(customerId: string, now: number): boolean {
    let entry = this.state.get(customerId)
    if (!entry) {
      entry = { tokens: this.burst, lastRefill: now }
      this.state.set(customerId, entry)
    }

    // Clamp at zero so a clock that goes backwards cannot mint tokens.
    const elapsed = Math.max(0, now - entry.lastRefill)
    entry.tokens = Math.min(this.burst, entry.tokens + elapsed * this.ratePerMs)
    entry.lastRefill = now

    if (entry.tokens < 1) return false
    entry.tokens--
    return true
  }
}

// ---- Follow-up 4: tiers and multiple limits ----

type Rule = { limit: number, windowMs: number }

// Compose rather than subclass: one window per rule per customer, all checked before any is written.
// Time: O(rules) per allow; space: O(customers * sum of limits).
export class TieredLimiter {
  private readonly windows = new Map<string, Queue<number>[]>()

  constructor(private readonly rules: Rule[]) {}

  allow(customerId: string, now: number): boolean {
    let queues = this.windows.get(customerId)
    if (!queues) {
      queues = this.rules.map(() => new Queue<number>())
      this.windows.set(customerId, queues)
    }

    // Two phases. Prune and test every rule first, record second, or a request the daily limit
    // rejects would still burn a slot in the per-minute limit.
    for (let i = 0; i < this.rules.length; i++) {
      const queue = queues[i]
      const cutoff = now - this.rules[i].windowMs
      while (queue.size() > 0 && (queue.peek() as number) <= cutoff) {
        queue.shift()
      }
      if (queue.size() >= this.rules[i].limit) return false
    }

    for (const queue of queues) queue.push(now)
    return true
  }
}

suite('rolling window', () => {
  const limiter = new QuotaLimiter(3, 1000)
  check(
    'first three allowed',
    [limiter.allow('acme', 0), limiter.allow('acme', 10), limiter.allow('acme', 20)],
    [true, true, true]
  )
  check('fourth inside the window rejected', limiter.allow('acme', 30), false)
  check('a rejection does not extend the block', limiter.allow('acme', 999), false)
  check('oldest hit expires exactly at now - windowMs', limiter.allow('acme', 1000), true)
  check('other customers are independent', limiter.allow('globex', 0), true)
})

suite('rolling window edges', () => {
  const single = new QuotaLimiter(1, 1000)
  check('one hit at t0', single.allow('acme', 0), true)
  check('still blocked one ms before the window closes', single.allow('acme', 999), false)
  check('free again at t0 + windowMs', single.allow('acme', 1000), true)

  const closed = new QuotaLimiter(0, 1000)
  check('a limit of zero rejects everything', closed.allow('acme', 0), false)

  // A backwards clock leaves stale hits at the front of the queue, so the limiter over-counts.
  // Wrong in the strict direction, which is the safe one.
  const rewound = new QuotaLimiter(2, 1000)
  check('two hits in the future', [rewound.allow('acme', 5000), rewound.allow('acme', 5001)], [true, true])
  check('a backwards clock stays conservative', rewound.allow('acme', 1), false)

  checkThrows('rejects a non-positive window', () => new QuotaLimiter(1, 0), 'windowMs')
  checkThrows('rejects a negative limit', () => new QuotaLimiter(-1, 1000), 'limit')
})

suite('follow-up 1: bounded memory', () => {
  const limiter = new BoundedQuotaLimiter(1, 1000, 2)
  check('a spends its one hit', [limiter.allow('a', 0), limiter.allow('a', 1)], [true, false])
  check('b and c allowed', [limiter.allow('b', 2), limiter.allow('c', 3)], [true, true])
  check('tracked customers capped', limiter.size(), 2)
  check('the evicted customer gets a fresh window', limiter.allow('a', 4), true)
  check('still capped after the new arrival', limiter.size(), 2)
})

suite('follow-up 2: sliding window counter', () => {
  const limiter = new ApproxQuotaLimiter(10, 1000)
  for (let i = 0; i < 10; i++) limiter.allow('acme', 900 + i)
  check('bucket full', limiter.allow('acme', 950), false)
  // The ten hits all landed in the last 100ms of bucket 0, so at 1500 the true rolling count is
  // still 10. The estimate weights them at half and allows the request: permissive, as warned.
  check('half into the next bucket the previous one counts for half', limiter.allow('acme', 1500), true)
  check('two buckets on, the old hits are gone entirely', limiter.allow('acme', 2000), true)
})

suite('follow-up 3: token bucket', () => {
  // 10 per second sustained, burst of 100, so 0.01 tokens per ms.
  const bucket = new TokenBucket(0.01, 100)
  let burst = 0
  for (let i = 0; i < 120; i++) if (bucket.allow('acme', 0)) burst++
  check('burst capped at the bucket size', burst, 100)
  check('empty bucket rejects', bucket.allow('acme', 0), false)
  check('one token back after 100ms', bucket.allow('acme', 100), true)
  check('and no more until the next refill', bucket.allow('acme', 100), false)

  let idle = 0
  for (let i = 0; i < 120; i++) if (bucket.allow('acme', 1000000)) idle++
  check('a long idle refills to the burst, not beyond', idle, 100)
})

suite('follow-up 4: tiers', () => {
  const limiter = new TieredLimiter([{ limit: 2, windowMs: 1000 }, { limit: 3, windowMs: 10000 }])
  check('under both limits', [limiter.allow('acme', 0), limiter.allow('acme', 1)], [true, true])
  check('the short window bites first', limiter.allow('acme', 2), false)
  check('short window rolls, long one still has room', limiter.allow('acme', 1001), true)
  check('now the long window bites', limiter.allow('acme', 1002), false)
  check('both windows roll', limiter.allow('acme', 11000), true)
})

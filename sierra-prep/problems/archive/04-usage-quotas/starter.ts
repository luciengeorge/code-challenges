import { check, checkThrows, suite } from '../../../lib/check'

// `check` needs a value and an unimplemented method throws before it can produce one, so trap the
// throw and let the message show up as the failure.
function attempt<T>(fn: () => T): T | string {
  try {
    return fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

export class QuotaLimiter {
  constructor(limit: number, windowMs: number) {}

  allow(customerId: string, now: number): boolean {
    throw new Error('not implemented')
  }
}

suite('rolling window', () => {
  const limiter = new QuotaLimiter(3, 1000)
  check(
    'first three allowed',
    attempt(() => [limiter.allow('acme', 0), limiter.allow('acme', 10), limiter.allow('acme', 20)]),
    [true, true, true]
  )
  check('fourth inside the window rejected', attempt(() => limiter.allow('acme', 30)), false)
  check('a rejection does not extend the block', attempt(() => limiter.allow('acme', 999)), false)
  check('oldest hit expires exactly at now - windowMs', attempt(() => limiter.allow('acme', 1000)), true)
  check('other customers are independent', attempt(() => limiter.allow('globex', 0)), true)
})

suite('rolling window edges', () => {
  const single = new QuotaLimiter(1, 1000)
  check('one hit at t0', attempt(() => single.allow('acme', 0)), true)
  check('still blocked one ms before the window closes', attempt(() => single.allow('acme', 999)), false)
  check('free again at t0 + windowMs', attempt(() => single.allow('acme', 1000)), true)

  const closed = new QuotaLimiter(0, 1000)
  check('a limit of zero rejects everything', attempt(() => closed.allow('acme', 0)), false)

  const rewound = new QuotaLimiter(2, 1000)
  check(
    'two hits in the future',
    attempt(() => [rewound.allow('acme', 5000), rewound.allow('acme', 5001)]),
    [true, true]
  )
  check('a backwards clock stays conservative', attempt(() => rewound.allow('acme', 1)), false)

  checkThrows('rejects a non-positive window', () => new QuotaLimiter(1, 0), 'windowMs')
  checkThrows('rejects a negative limit', () => new QuotaLimiter(-1, 1000), 'limit')
})

// FOLLOW-UP 1: bounded memory. Write BoundedQuotaLimiter(limit, windowMs, maxCustomers) with a
// size() accessor, then uncomment.
// suite('follow-up 1: bounded memory', () => {
//   const limiter = new BoundedQuotaLimiter(1, 1000, 2)
//   check('a spends its one hit', [limiter.allow('a', 0), limiter.allow('a', 1)], [true, false])
//   check('b and c allowed', [limiter.allow('b', 2), limiter.allow('c', 3)], [true, true])
//   check('tracked customers capped', limiter.size(), 2)
//   check('the evicted customer gets a fresh window', limiter.allow('a', 4), true)
//   check('still capped after the new arrival', limiter.size(), 2)
// })

// FOLLOW-UP 2: sliding window counter. Write ApproxQuotaLimiter(limit, windowMs), then uncomment.
// suite('follow-up 2: sliding window counter', () => {
//   const limiter = new ApproxQuotaLimiter(10, 1000)
//   for (let i = 0; i < 10; i++) limiter.allow('acme', 900 + i)
//   check('bucket full', limiter.allow('acme', 950), false)
//   check('half into the next bucket the previous one counts for half', limiter.allow('acme', 1500), true)
//   check('two buckets on, the old hits are gone entirely', limiter.allow('acme', 2000), true)
// })

// FOLLOW-UP 3: token bucket. Write TokenBucket(ratePerMs, burst), then uncomment.
// suite('follow-up 3: token bucket', () => {
//   const bucket = new TokenBucket(0.01, 100)
//   let burst = 0
//   for (let i = 0; i < 120; i++) if (bucket.allow('acme', 0)) burst++
//   check('burst capped at the bucket size', burst, 100)
//   check('empty bucket rejects', bucket.allow('acme', 0), false)
//   check('one token back after 100ms', bucket.allow('acme', 100), true)
//   check('and no more until the next refill', bucket.allow('acme', 100), false)
//   let idle = 0
//   for (let i = 0; i < 120; i++) if (bucket.allow('acme', 1000000)) idle++
//   check('a long idle refills to the burst, not beyond', idle, 100)
// })

// FOLLOW-UP 4: tiers. Write TieredLimiter(rules) where a rule is { limit, windowMs }, then uncomment.
// suite('follow-up 4: tiers', () => {
//   const limiter = new TieredLimiter([{ limit: 2, windowMs: 1000 }, { limit: 3, windowMs: 10000 }])
//   check('under both limits', [limiter.allow('acme', 0), limiter.allow('acme', 1)], [true, true])
//   check('the short window bites first', limiter.allow('acme', 2), false)
//   check('short window rolls, long one still has room', limiter.allow('acme', 1001), true)
//   check('now the long window bites', limiter.allow('acme', 1002), false)
//   check('both windows roll', limiter.allow('acme', 11000), true)
// })

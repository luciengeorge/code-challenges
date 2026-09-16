import { check, suite } from '../../lib/check'

type Attempt<T> = () => Promise<T>

type Sleep = (ms: number) => Promise<void>

type RetryOptions = {
  maxAttempts: number
  baseDelayMs: number
  sleep?: Sleep                               // injected so tests do not actually wait
}

class HttpError extends Error {
  constructor(readonly status: number, message?: string) {
    super(message ?? `HTTP ${status}`)
  }
}

class TimeoutError extends Error {}

class AbortError extends Error {}

// A 4xx says the request itself is wrong, so sending it again cannot help. 408 and 429 are the two
// exceptions: there the server is asking you to come back. Anything without a status is a transport
// failure, which is the case retries exist for.
function isRetryable(err: unknown): boolean {
  if (err instanceof AbortError) return false
  if (err instanceof HttpError) return err.status >= 500 || err.status === 408 || err.status === 429
  return true
}

const defaultSleep: Sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Time O(maxAttempts) calls, space O(1). Decision: maxAttempts is the TOTAL number of calls, so 3
// means one try and two retries, and there are exactly maxAttempts - 1 sleeps.
export async function withRetry<T>(fn: Attempt<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, baseDelayMs, sleep = defaultSleep } = options
  if (maxAttempts < 1) throw new Error('maxAttempts must be at least 1')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // No delay before the first attempt. The service is usually up.
      return await fn()
    } catch (err) {
      // Decision: the caller sees the last error. Gathering every error into an AggregateError is
      // the other defensible answer and costs one array.
      if (attempt === maxAttempts || !isRetryable(err)) throw err
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
  // Unreachable once maxAttempts >= 1; the compiler cannot see that the loop always leaves.
  throw new Error('unreachable')
}

// ---- Follow-up 1: per-attempt timeout ----

// Wraps an attempt so it rejects after timeoutMs. Kept outside withRetry so each half stays small
// and testable, and so a caller can put a timeout on something that is not being retried.
export function withTimeout<T>(fn: Attempt<T>, timeoutMs: number, sleep: Sleep = defaultSleep): Attempt<T> {
  return () => {
    const expiry = sleep(timeoutMs).then<T>(() => {
      throw new TimeoutError(`attempt timed out after ${timeoutMs}ms`)
    })
    // Promise.race settles on the first one home and abandons the other. The loser is NOT
    // cancelled: the request runs on, holds its socket, and its result is dropped on the floor.
    // Only an AbortSignal handed to fetch actually stops the work, which is follow-up 4.
    return Promise.race([fn(), expiry])
  }
}

// ---- Follow-up 2: jitter ----

// Full jitter picks anywhere in [0, cappedDelay). Equal jitter (half fixed, half random) keeps more
// of the backoff shape; full jitter spreads the herd widest, which is what you want when a thousand
// clients all failed on the same instant and are all counting to one second.
export function computeDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs = Infinity,
  jitter = false,
  random: () => number = Math.random
): number {
  const capped = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
  return jitter ? random() * capped : capped
}

// ---- Follow-up 3: overall deadline ----

type BudgetOptions = {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs?: number
  jitter?: boolean
  random?: () => number
  deadlineMs?: number
  now?: () => number                          // injected for the same reason as sleep
  sleep?: Sleep
  signal?: AbortSignal
}

// Time O(maxAttempts) calls, space O(1). Attempts and sleeps now share one budget, so the last
// sleep is shortened to whatever is left rather than overshooting the deadline and then noticing.
export async function withRetryBudget<T>(fn: Attempt<T>, options: BudgetOptions): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = Infinity,
    jitter = false,
    random = Math.random,
    deadlineMs = Infinity,
    now = Date.now,
    sleep = defaultSleep,
    signal
  } = options
  if (maxAttempts < 1) throw new Error('maxAttempts must be at least 1')

  const startedAt = now()
  const budgetLeft = (): number => deadlineMs - (now() - startedAt)
  const expired = (): Error => new Error(`retry deadline of ${deadlineMs}ms exceeded`)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) throw new AbortError('retry aborted')
    // Decision: the budget is half-open. Nothing left means no attempt, not one last free go.
    if (budgetLeft() <= 0) throw expired()
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxAttempts || !isRetryable(err)) throw err
      const wait = Math.min(computeDelay(attempt, baseDelayMs, maxDelayMs, jitter, random), budgetLeft())
      if (wait <= 0) throw expired()
      await sleepOrAbort(wait, sleep, signal)
    }
  }
  throw new Error('unreachable')
}

// ---- Follow-up 4: cancellation ----

// A sleep that loses to an abort. Without it a cancelled retry still sits out its full backoff
// before it notices, which is exactly the wait the user navigated away from. The signal should also
// be handed to fetch inside fn, so the in-flight request dies rather than being abandoned.
function sleepOrAbort(ms: number, sleep: Sleep, signal?: AbortSignal): Promise<void> {
  if (signal === undefined) return sleep(ms)
  if (signal.aborted) return Promise.reject(new AbortError('retry aborted'))
  return new Promise<void>((resolve, reject) => {
    const onAbort = (): void => reject(new AbortError('retry aborted'))
    signal.addEventListener('abort', onAbort, { once: true })
    sleep(ms).then(
      () => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      },
      err => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      }
    )
  })
}

// ---- Follow-up 5: circuit breaker (discussion) ----
// Retries help one caller past a blip; they make a real outage worse, because every client keeps
// knocking. A breaker holds three states and one rolling failure count per downstream service:
// closed (normal), open (fail immediately for cooldownMs, never touching the network), half-open
// (let a single probe through; success closes it, failure re-opens it with a longer cooldown).
// Trip on a failure RATE over a window, not a raw count, or a busy service trips on noise.
// The state belongs to the process, so with many pods each one learns separately unless you share
// it; that is usually fine, and cheaper than the coordination.

// ---- tests ----

type Counted<T> = { fn: Attempt<T>, state: { calls: number } }

const counted = <T>(behaviour: (call: number) => Promise<T>): Counted<T> => {
  const state = { calls: 0 }
  return { state, fn: () => behaviour(++state.calls) }
}

// Records what was asked for and resolves at once, so the whole suite runs in microseconds and the
// backoff maths is checked by reading delays rather than by waiting.
const recorder = (): { delays: number[], sleep: Sleep } => {
  const delays: number[] = []
  return {
    delays,
    sleep: ms => {
      delays.push(ms)
      return Promise.resolve()
    }
  }
}

// The fake sleep doubles as the fake clock: waiting 150ms moves time 150ms and returns.
const fakeClock = (): { delays: number[], sleep: Sleep, now: () => number } => {
  const delays: number[] = []
  let ts = 0
  return {
    delays,
    now: () => ts,
    sleep: ms => {
      delays.push(ms)
      ts += ms
      return Promise.resolve()
    }
  }
}

const never = <T>(): Promise<T> => new Promise<T>(() => {})

// `check` compares a value that already exists, so a rejection has to be turned into one first.
async function rejects(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
    return 'resolved, expected a rejection'
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

async function coreSuite(): Promise<void> {
  const clean = counted(async () => 'ok')
  const cleanSleep = recorder()
  const cleanResult = await withRetry(clean.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: cleanSleep.sleep })

  const flaky = counted<string>(async call => {
    if (call < 3) throw new Error('boom')
    return 'ok'
  })
  const flakySleep = recorder()
  const flakyResult = await withRetry(flaky.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: flakySleep.sleep })

  const dead = counted<string>(async () => {
    throw new Error('boom')
  })
  const deadSleep = recorder()
  const deadMessage = await rejects(() =>
    withRetry(dead.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: deadSleep.sleep }))

  const four = counted<string>(async () => {
    throw new Error('boom')
  })
  const fourSleep = recorder()
  await rejects(() => withRetry(four.fn, { maxAttempts: 4, baseDelayMs: 100, sleep: fourSleep.sleep }))

  const badRequest = counted<string>(async () => {
    throw new HttpError(400, 'bad request')
  })
  const badSleep = recorder()
  const badMessage = await rejects(() =>
    withRetry(badRequest.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: badSleep.sleep }))

  const throttled = counted<string>(async call => {
    if (call === 1) throw new HttpError(429)
    return 'ok'
  })
  const throttledSleep = recorder()
  const throttledResult = await withRetry(throttled.fn, {
    maxAttempts: 3,
    baseDelayMs: 100,
    sleep: throttledSleep.sleep
  })

  const once = counted<string>(async () => {
    throw new Error('boom')
  })
  const onceSleep = recorder()
  const onceMessage = await rejects(() =>
    withRetry(once.fn, { maxAttempts: 1, baseDelayMs: 100, sleep: onceSleep.sleep }))

  const zeroMessage = await rejects(() =>
    withRetry(async () => 'ok', { maxAttempts: 0, baseDelayMs: 100, sleep: recorder().sleep }))

  suite('withRetry', () => {
    check('returns the first success', cleanResult, 'ok')
    check('one call and no sleep before it', [clean.state.calls, cleanSleep.delays], [1, []])

    check('returns the value once the call recovers', flakyResult, 'ok')
    check('two failures cost two sleeps', [flaky.state.calls, flakySleep.delays], [3, [100, 200]])

    check('the last error reaches the caller', deadMessage, 'boom')
    check('maxAttempts 3 means 3 calls and 2 sleeps', [dead.state.calls, deadSleep.delays], [3, [100, 200]])

    check('delays double', [four.state.calls, fourSleep.delays], [4, [100, 200, 400]])

    check('a 400 is not retried', badMessage, 'bad request')
    check('a permanent failure costs one call and no sleep', [badRequest.state.calls, badSleep.delays], [1, []])

    check('a 429 is retried', throttledResult, 'ok')
    check('the throttled call slept once', [throttled.state.calls, throttledSleep.delays], [2, [100]])

    check('maxAttempts 1 is a single call with no sleep',
      [onceMessage, once.state.calls, onceSleep.delays], ['boom', 1, []])

    check('maxAttempts below 1 is rejected', zeroMessage, 'maxAttempts must be at least 1')
  })
}

async function timeoutSuite(): Promise<void> {
  const hung = recorder()
  const hungMessage = await rejects(() => withTimeout(() => never<string>(), 50, hung.sleep)())

  // The timer never fires here, so the fast attempt wins the race on merit rather than on ordering.
  const fastResult = await withTimeout(async () => 'fast', 50, () => never<void>())()

  const stuck = counted(() => never<string>())
  const stuckTimeouts = recorder()
  const stuckBackoff = recorder()
  const stuckMessage = await rejects(() =>
    withRetry(withTimeout(stuck.fn, 50, stuckTimeouts.sleep), {
      maxAttempts: 3,
      baseDelayMs: 100,
      sleep: stuckBackoff.sleep
    }))

  suite('withTimeout', () => {
    check('a hanging attempt rejects on the deadline', hungMessage, 'attempt timed out after 50ms')
    check('the timer was asked for the right delay', hung.delays, [50])
    check('a fast attempt wins the race', fastResult, 'fast')

    check('a timeout is retryable', stuckMessage, 'attempt timed out after 50ms')
    check('every attempt gets its own deadline',
      [stuck.state.calls, stuckTimeouts.delays, stuckBackoff.delays], [3, [50, 50, 50], [100, 200]])
  })
}

function jitterSuite(): void {
  suite('computeDelay', () => {
    check('plain exponential growth',
      [computeDelay(1, 100), computeDelay(2, 100), computeDelay(3, 100)], [100, 200, 400])
    check('growth stops at the cap', computeDelay(9, 100, 1000), 1000)
    check('full jitter halves the capped delay when random gives a half',
      computeDelay(3, 100, Infinity, true, () => 0.5), 200)
    check('full jitter can pick zero', computeDelay(3, 100, Infinity, true, () => 0), 0)
    check('full jitter never exceeds the cap',
      computeDelay(9, 100, 1000, true, () => 0.999) < 1000, true)
  })
}

async function budgetSuite(): Promise<void> {
  const clock = fakeClock()
  const cut = counted<string>(async () => {
    throw new Error('boom')
  })
  const cutMessage = await rejects(() =>
    withRetryBudget(cut.fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      deadlineMs: 250,
      now: clock.now,
      sleep: clock.sleep
    }))

  const spent = fakeClock()
  const untouched = counted(async () => 'ok')
  const spentMessage = await rejects(() =>
    withRetryBudget(untouched.fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      deadlineMs: 0,
      now: spent.now,
      sleep: spent.sleep
    }))

  const roomy = fakeClock()
  const recovers = counted<string>(async call => {
    if (call === 1) throw new Error('boom')
    return 'ok'
  })
  const roomyResult = await withRetryBudget(recovers.fn, {
    maxAttempts: 3,
    baseDelayMs: 100,
    deadlineMs: 1000,
    now: roomy.now,
    sleep: roomy.sleep
  })

  suite('withRetryBudget', () => {
    check('the deadline stops the retries', cutMessage, 'retry deadline of 250ms exceeded')
    check('the last sleep is shortened to the budget left',
      [cut.state.calls, clock.delays], [2, [100, 150]])

    check('a spent budget rejects before the first call', spentMessage, 'retry deadline of 0ms exceeded')
    check('and the downstream service is never touched', untouched.state.calls, 0)

    check('a retry inside the budget still succeeds', roomyResult, 'ok')
    check('and it slept once', [recovers.state.calls, roomy.delays], [2, [100]])
  })
}

async function abortSuite(): Promise<void> {
  const early = new AbortController()
  early.abort()
  const untouched = counted(async () => 'ok')
  const earlyMessage = await rejects(() =>
    withRetryBudget(untouched.fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      signal: early.signal,
      sleep: recorder().sleep
    }))

  // Aborting from inside the fake sleep is the deterministic stand-in for a user navigating away
  // halfway through a backoff: the sleep is in flight and never resolves on its own.
  const mid = new AbortController()
  const midDelays: number[] = []
  const midSleep: Sleep = ms => {
    midDelays.push(ms)
    mid.abort()
    return never<void>()
  }
  const failing = counted<string>(async () => {
    throw new Error('boom')
  })
  const midMessage = await rejects(() =>
    withRetryBudget(failing.fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      signal: mid.signal,
      sleep: midSleep
    }))

  const between = new AbortController()
  const betweenSleep = recorder()
  const cancelled = counted<string>(async () => {
    between.abort()
    throw new Error('boom')
  })
  const betweenMessage = await rejects(() =>
    withRetryBudget(cancelled.fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      signal: between.signal,
      sleep: betweenSleep.sleep
    }))

  suite('cancellation', () => {
    check('an already aborted signal rejects at once', earlyMessage, 'retry aborted')
    check('and nothing is called', untouched.state.calls, 0)

    check('an abort mid-sleep does not wait the sleep out', midMessage, 'retry aborted')
    check('one call, one interrupted sleep', [failing.state.calls, midDelays], [1, [100]])

    check('an abort between attempts stops the next one', betweenMessage, 'retry aborted')
    check('an aborted retry never starts its backoff sleep',
      [cancelled.state.calls, betweenSleep.delays], [1, []])
  })
}

async function main(): Promise<void> {
  await coreSuite()
  await timeoutSuite()
  jitterSuite()
  await budgetSuite()
  await abortSuite()
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})

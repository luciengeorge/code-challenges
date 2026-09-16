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

export async function withRetry<T>(fn: Attempt<T>, options: RetryOptions): Promise<T> {
  throw new Error('not implemented')
}

// `check` compares a value that already exists, so await first and turn a rejection into its
// message. An unimplemented function therefore shows up as one FAIL line, not a dead run.
async function attempt<T>(fn: () => Promise<T>): Promise<T | string> {
  try {
    return await fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

type Counted<T> = { fn: Attempt<T>, state: { calls: number } }

const counted = <T>(behaviour: (call: number) => Promise<T>): Counted<T> => {
  const state = { calls: 0 }
  return { state, fn: () => behaviour(++state.calls) }
}

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

async function coreSuite(): Promise<void> {
  const clean = counted(async () => 'ok')
  const cleanSleep = recorder()
  const cleanResult = await attempt(() =>
    withRetry(clean.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: cleanSleep.sleep }))

  const flaky = counted<string>(async call => {
    if (call < 3) throw new Error('boom')
    return 'ok'
  })
  const flakySleep = recorder()
  const flakyResult = await attempt(() =>
    withRetry(flaky.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: flakySleep.sleep }))

  const dead = counted<string>(async () => {
    throw new Error('boom')
  })
  const deadSleep = recorder()
  const deadResult = await attempt(() =>
    withRetry(dead.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: deadSleep.sleep }))

  const four = counted<string>(async () => {
    throw new Error('boom')
  })
  const fourSleep = recorder()
  await attempt(() => withRetry(four.fn, { maxAttempts: 4, baseDelayMs: 100, sleep: fourSleep.sleep }))

  const badRequest = counted<string>(async () => {
    throw new HttpError(400, 'bad request')
  })
  const badSleep = recorder()
  const badResult = await attempt(() =>
    withRetry(badRequest.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: badSleep.sleep }))

  const throttled = counted<string>(async call => {
    if (call === 1) throw new HttpError(429)
    return 'ok'
  })
  const throttledSleep = recorder()
  const throttledResult = await attempt(() =>
    withRetry(throttled.fn, { maxAttempts: 3, baseDelayMs: 100, sleep: throttledSleep.sleep }))

  const once = counted<string>(async () => {
    throw new Error('boom')
  })
  const onceSleep = recorder()
  const onceResult = await attempt(() =>
    withRetry(once.fn, { maxAttempts: 1, baseDelayMs: 100, sleep: onceSleep.sleep }))

  const zeroResult = await attempt(() =>
    withRetry(async () => 'ok', { maxAttempts: 0, baseDelayMs: 100, sleep: recorder().sleep }))

  suite('withRetry', () => {
    check('returns the first success', cleanResult, 'ok')
    check('one call and no sleep before it', [clean.state.calls, cleanSleep.delays], [1, []])

    check('returns the value once the call recovers', flakyResult, 'ok')
    check('two failures cost two sleeps', [flaky.state.calls, flakySleep.delays], [3, [100, 200]])

    check('the last error reaches the caller', deadResult, 'boom')
    check('maxAttempts 3 means 3 calls and 2 sleeps', [dead.state.calls, deadSleep.delays], [3, [100, 200]])

    check('delays double', [four.state.calls, fourSleep.delays], [4, [100, 200, 400]])

    check('a 400 is not retried', badResult, 'bad request')
    check('a permanent failure costs one call and no sleep', [badRequest.state.calls, badSleep.delays], [1, []])

    check('a 429 is retried', throttledResult, 'ok')
    check('the throttled call slept once', [throttled.state.calls, throttledSleep.delays], [2, [100]])

    check('maxAttempts 1 is a single call with no sleep',
      [onceResult, once.state.calls, onceSleep.delays], ['boom', 1, []])

    check('maxAttempts below 1 is rejected', zeroResult, 'maxAttempts must be at least 1')
  })
}

// FOLLOW-UP 1: write withTimeout(fn, timeoutMs, sleep), then uncomment.
// async function timeoutSuite(): Promise<void> {
//   const hung = recorder()
//   const hungResult = await attempt(() => withTimeout(() => never<string>(), 50, hung.sleep)())
//
//   const fastResult = await attempt(() => withTimeout(async () => 'fast', 50, () => never<void>())())
//
//   const stuck = counted(() => never<string>())
//   const stuckTimeouts = recorder()
//   const stuckBackoff = recorder()
//   const stuckResult = await attempt(() =>
//     withRetry(withTimeout(stuck.fn, 50, stuckTimeouts.sleep), {
//       maxAttempts: 3,
//       baseDelayMs: 100,
//       sleep: stuckBackoff.sleep
//     }))
//
//   suite('withTimeout', () => {
//     check('a hanging attempt rejects on the deadline', hungResult, 'attempt timed out after 50ms')
//     check('the timer was asked for the right delay', hung.delays, [50])
//     check('a fast attempt wins the race', fastResult, 'fast')
//
//     check('a timeout is retryable', stuckResult, 'attempt timed out after 50ms')
//     check('every attempt gets its own deadline',
//       [stuck.state.calls, stuckTimeouts.delays, stuckBackoff.delays], [3, [50, 50, 50], [100, 200]])
//   })
// }

// FOLLOW-UP 2: write computeDelay(attempt, baseDelayMs, maxDelayMs, jitter, random), then uncomment.
// function jitterSuite(): void {
//   suite('computeDelay', () => {
//     check('plain exponential growth',
//       [computeDelay(1, 100), computeDelay(2, 100), computeDelay(3, 100)], [100, 200, 400])
//     check('growth stops at the cap', computeDelay(9, 100, 1000), 1000)
//     check('full jitter halves the capped delay when random gives a half',
//       computeDelay(3, 100, Infinity, true, () => 0.5), 200)
//     check('full jitter can pick zero', computeDelay(3, 100, Infinity, true, () => 0), 0)
//     check('full jitter never exceeds the cap',
//       computeDelay(9, 100, 1000, true, () => 0.999) < 1000, true)
//   })
// }

// FOLLOW-UP 3: write withRetryBudget(fn, options) taking deadlineMs and now, then uncomment.
// async function budgetSuite(): Promise<void> {
//   const clock = fakeClock()
//   const cut = counted<string>(async () => {
//     throw new Error('boom')
//   })
//   const cutResult = await attempt(() =>
//     withRetryBudget(cut.fn, {
//       maxAttempts: 5,
//       baseDelayMs: 100,
//       deadlineMs: 250,
//       now: clock.now,
//       sleep: clock.sleep
//     }))
//
//   const spent = fakeClock()
//   const untouched = counted(async () => 'ok')
//   const spentResult = await attempt(() =>
//     withRetryBudget(untouched.fn, {
//       maxAttempts: 3,
//       baseDelayMs: 100,
//       deadlineMs: 0,
//       now: spent.now,
//       sleep: spent.sleep
//     }))
//
//   const roomy = fakeClock()
//   const recovers = counted<string>(async call => {
//     if (call === 1) throw new Error('boom')
//     return 'ok'
//   })
//   const roomyResult = await attempt(() =>
//     withRetryBudget(recovers.fn, {
//       maxAttempts: 3,
//       baseDelayMs: 100,
//       deadlineMs: 1000,
//       now: roomy.now,
//       sleep: roomy.sleep
//     }))
//
//   suite('withRetryBudget', () => {
//     check('the deadline stops the retries', cutResult, 'retry deadline of 250ms exceeded')
//     check('the last sleep is shortened to the budget left',
//       [cut.state.calls, clock.delays], [2, [100, 150]])
//
//     check('a spent budget rejects before the first call', spentResult, 'retry deadline of 0ms exceeded')
//     check('and the downstream service is never touched', untouched.state.calls, 0)
//
//     check('a retry inside the budget still succeeds', roomyResult, 'ok')
//     check('and it slept once', [recovers.state.calls, roomy.delays], [2, [100]])
//   })
// }

// FOLLOW-UP 4: take an AbortSignal in the options and interrupt the sleep, then uncomment.
// async function abortSuite(): Promise<void> {
//   const early = new AbortController()
//   early.abort()
//   const untouched = counted(async () => 'ok')
//   const earlyResult = await attempt(() =>
//     withRetryBudget(untouched.fn, {
//       maxAttempts: 3,
//       baseDelayMs: 100,
//       signal: early.signal,
//       sleep: recorder().sleep
//     }))
//
//   const mid = new AbortController()
//   const midDelays: number[] = []
//   const midSleep: Sleep = ms => {
//     midDelays.push(ms)
//     mid.abort()
//     return never<void>()
//   }
//   const failing = counted<string>(async () => {
//     throw new Error('boom')
//   })
//   const midResult = await attempt(() =>
//     withRetryBudget(failing.fn, {
//       maxAttempts: 3,
//       baseDelayMs: 100,
//       signal: mid.signal,
//       sleep: midSleep
//     }))
//
//   const between = new AbortController()
//   const betweenSleep = recorder()
//   const cancelled = counted<string>(async () => {
//     between.abort()
//     throw new Error('boom')
//   })
//   const betweenResult = await attempt(() =>
//     withRetryBudget(cancelled.fn, {
//       maxAttempts: 3,
//       baseDelayMs: 100,
//       signal: between.signal,
//       sleep: betweenSleep.sleep
//     }))
//
//   suite('cancellation', () => {
//     check('an already aborted signal rejects at once', earlyResult, 'retry aborted')
//     check('and nothing is called', untouched.state.calls, 0)
//
//     check('an abort mid-sleep does not wait the sleep out', midResult, 'retry aborted')
//     check('one call, one interrupted sleep', [failing.state.calls, midDelays], [1, [100]])
//
//     check('an abort between attempts stops the next one', betweenResult, 'retry aborted')
//     check('an aborted retry never starts its backoff sleep',
//       [cancelled.state.calls, betweenSleep.delays], [1, []])
//   })
// }

// FOLLOW-UP 5: no code. Describe the circuit breaker out loud: its three states, what trips it,
// what closes it again, and what happens to the state when you run fifty pods.

async function main(): Promise<void> {
  await coreSuite()
  // await timeoutSuite()
  // jitterSuite()
  // await budgetSuite()
  // await abortSuite()
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})

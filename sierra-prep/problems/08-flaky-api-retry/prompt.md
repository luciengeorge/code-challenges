# 8. Retrying a flaky endpoint

**Evidence: strong.** Two independent sources. A first-hand account says the screen opened with an
API endpoint that *"fails occasionally but eventually succeeds"*. Sierra's question bank lists
*"debug and extend a codebase by adding an async exponential retry mechanism with timeouts and
backoff"*. Async is the single biggest gap in most people's DS&A prep.

**Budget:** 45 min. Read only this file. Spoiler at the bottom.

## Setup

A downstream service is unreliable. Wrap a call to it so transient failures stop being your problem.

```ts
type Attempt<T> = () => Promise<T>

type RetryOptions = {
  maxAttempts: number
  baseDelayMs: number
  sleep?: (ms: number) => Promise<void>   // injected so tests do not actually wait
}

async function withRetry<T>(fn: Attempt<T>, options: RetryOptions): Promise<T>
```

Retry on failure with exponentially growing delays. If every attempt fails, throw.

**Inject `sleep`.** Do it before the interviewer asks, and say why: a test for backoff that really
sleeps for eight seconds is a test nobody runs. This is the same instinct as injecting a clock.

## Ask these before writing code

- Is `maxAttempts` the total number of calls, or the number of retries after the first? Say which you
  mean. Off-by-one here is the most common bug in retry code that ships.
- Should the delay come before the first attempt? No. Make sure your loop agrees.
- Which failures are worth retrying? A 500 yes, a 400 no. Retrying a bad request forever is how you
  turn your own bug into an outage.
- What do you throw when everything fails: the last error, or all of them?
- Is the operation safe to repeat at all? If the call charges a customer, retrying is a bug, not a
  feature. Ask whether it is idempotent.

## Follow-ups the interviewer will reach for

1. **Per-attempt timeout.** A call that hangs forever never fails, so it never retries. Give each
   attempt its own deadline. `Promise.race` is the tool; the trap is the loser of the race carrying
   on in the background, so say what happens to it.
2. **Jitter.** Every client retrying at exactly 1s, 2s, 4s after an outage stampedes the service the
   moment it comes back. Add jitter and explain which kind.
3. **Overall deadline.** The caller has 5 seconds total, whatever the attempt maths says. Now the
   sleep and the attempts share one budget.
4. **Cancellation.** The user navigated away. Take an `AbortSignal` and stop, mid-sleep if need be.
5. **Circuit breaker.** The service has been down for a minute. Stop asking. Describe it; you do not
   have time to build it.

## What this is probing

Whether you can write correct async TypeScript under pressure: `await` inside a loop, errors caught
and rethrown without swallowing the stack, `Promise.race` and its leak, and a design that is testable
because you injected the slow part. Almost nobody drills this, and it is closer to the actual job than
any tree problem.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

```
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try { return await fn() }
  catch (err) {
    if (attempt === maxAttempts || !isRetryable(err)) throw err
    await sleep(baseDelayMs * 2 ** (attempt - 1))
  }
}
```
Timeout: `Promise.race([fn(), rejectAfter(ms)])`, and note the original promise keeps running.
Full jitter: `Math.random() * cappedDelay`. Deadline: compare `Date.now()` against a start time before
each sleep and each attempt, and shorten the last sleep rather than overshooting.
</details>

import { check, suite } from '../../lib/check'

type Busy = { agentId: string, start: number, end: number }

// `check` needs a value and an unimplemented function throws before it can produce one, so trap the
// throw and let the message show up as the failure.
function attempt<T>(fn: () => T): T | string {
  try {
    return fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

export function earliestSlot(
  busy: Busy[],
  from: number,
  durationMs: number
): { agentId: string, start: number } | null {
  throw new Error('not implemented')
}

suite('earliest slot', () => {
  const busy: Busy[] = [
    { agentId: 'ana', start: 0, end: 30 },
    { agentId: 'ana', start: 40, end: 90 },
    { agentId: 'bo', start: 10, end: 50 }
  ]
  check('short slot fits before bo starts', attempt(() => earliestSlot(busy, 0, 10)), { agentId: 'bo', start: 0 })
  check('longer slot waits for bo to finish', attempt(() => earliestSlot(busy, 0, 20)), { agentId: 'bo', start: 50 })
  check('from is respected', attempt(() => earliestSlot(busy, 60, 20)), { agentId: 'bo', start: 60 })
  check('slot can run past the last block', attempt(() => earliestSlot(busy, 0, 500)), { agentId: 'bo', start: 50 })

  const messy: Busy[] = [
    { agentId: 'ana', start: 40, end: 90 },
    { agentId: 'ana', start: 0, end: 50 },
    { agentId: 'ana', start: 20, end: 30 }
  ]
  check('unsorted overlapping blocks merge', attempt(() => earliestSlot(messy, 0, 10)), {
    agentId: 'ana',
    start: 90
  })
  check('input not mutated', messy[0], { agentId: 'ana', start: 40, end: 90 })
})

suite('earliest slot edges', () => {
  check('no agents at all', attempt(() => earliestSlot([], 0, 10)), null)

  const touching: Busy[] = [
    { agentId: 'ana', start: 0, end: 10 },
    { agentId: 'ana', start: 10, end: 20 }
  ]
  check('half-open: no usable gap at the join', attempt(() => earliestSlot(touching, 0, 5)), {
    agentId: 'ana',
    start: 20
  })

  const exact: Busy[] = [
    { agentId: 'ana', start: 0, end: 10 },
    { agentId: 'ana', start: 20, end: 30 }
  ]
  check('a gap of exactly the duration counts', attempt(() => earliestSlot(exact, 0, 10)), {
    agentId: 'ana',
    start: 10
  })
  check('one ms more does not', attempt(() => earliestSlot(exact, 0, 11)), { agentId: 'ana', start: 30 })

  check(
    'zero-length blocks ignored',
    attempt(() => earliestSlot([{ agentId: 'ana', start: 5, end: 5 }], 0, 10)),
    { agentId: 'ana', start: 0 }
  )
  check(
    'zero duration is free immediately',
    attempt(() => earliestSlot([{ agentId: 'ana', start: 0, end: 10 }], 0, 0)),
    { agentId: 'ana', start: 0 }
  )

  const tie: Busy[] = [
    { agentId: 'zoe', start: 100, end: 200 },
    { agentId: 'ana', start: 100, end: 200 }
  ]
  check('ties go to the first agentId', attempt(() => earliestSlot(tie, 0, 50)), { agentId: 'ana', start: 0 })
})

// FOLLOW-UP 1: working hours. Write earliestSlotInShift(busy, shifts, from, durationMs) where a
// shift is { agentId, start, end }, then uncomment.
// suite('follow-up 1: working hours', () => {
//   const shifts = [
//     { agentId: 'ana', start: 900, end: 1700 },
//     { agentId: 'bo', start: 1300, end: 2100 }
//   ]
//   const busy: Busy[] = [{ agentId: 'ana', start: 900, end: 1650 }]
//   check('before the shift does not count', earliestSlotInShift(busy, shifts, 800, 60), {
//     agentId: 'bo',
//     start: 1300
//   })
//   check('an agent with no blocks is still schedulable', earliestSlotInShift([], shifts, 0, 60), {
//     agentId: 'ana',
//     start: 900
//   })
//   check('nobody has a long enough shift', earliestSlotInShift(busy, shifts, 800, 5000), null)
// })

// FOLLOW-UP 2: peak staffing. Write peakConcurrency(busy) returning { count, at }, then uncomment.
// suite('follow-up 2: peak staffing', () => {
//   const busy: Busy[] = [
//     { agentId: 'ana', start: 0, end: 30 },
//     { agentId: 'bo', start: 10, end: 40 },
//     { agentId: 'cy', start: 20, end: 25 }
//   ]
//   check('three at once', peakConcurrency(busy), { count: 3, at: 20 })
//   const backToBack: Busy[] = [
//     { agentId: 'ana', start: 0, end: 10 },
//     { agentId: 'bo', start: 10, end: 20 }
//   ]
//   check('half-open: back to back is not concurrent', peakConcurrency(backToBack), { count: 1, at: 0 })
//   check('nothing booked', peakConcurrency([]), { count: 0, at: null })
// })

// FOLLOW-UP 3: scale. No code. Say out loud what you precompute for 5,000 agents with 200 intervals
// each, and what a new booking costs you.

// FOLLOW-UP 4: book it. Write class Scheduler(busy) with book(from, durationMs), then uncomment.
// suite('follow-up 4: book it', () => {
//   const scheduler = new Scheduler([
//     { agentId: 'ana', start: 0, end: 100 },
//     { agentId: 'bo', start: 0, end: 60 }
//   ])
//   check('first booking takes the earliest', scheduler.book(0, 30), { agentId: 'bo', start: 60 })
//   check('second booking cannot reuse it', scheduler.book(0, 30), { agentId: 'bo', start: 90 })
//   check('third booking moves to the other agent', scheduler.book(0, 30), { agentId: 'ana', start: 100 })
// })

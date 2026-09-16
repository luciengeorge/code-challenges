import { check, suite } from '../../../lib/check'

type Busy = { agentId: string, start: number, end: number }
type Slot = { agentId: string, start: number }

// Decisions made up front:
// - Intervals are half-open [start, end). A block ending at 10:00 and a slot starting at 10:00 do
//   not overlap, so touching blocks merge but leave no usable gap between them.
// - Blocks arrive unsorted and may overlap each other, even for the same agent. Merge, do not assume.
// - Zero-length blocks are dropped: [5, 5) contains no instant.
// - Time is unbounded at the top end, so the gap after an agent's last block always qualifies.
// - Ties go to the alphabetically first agentId, so the same input always picks the same agent.
// - The roster is whatever appears in `busy`. An agent with no blocks at all is invisible to this
//   signature, which is why `busy: []` returns null. Follow-up 1 fixes that by taking shifts.

// Time: O(n log n) for the per-agent sorts; space: O(n) for the grouped copies.
export function earliestSlot(busy: Busy[], from: number, durationMs: number): Slot | null {
  const byAgent = new Map<string, Busy[]>()
  for (const block of busy) {
    const blocks = byAgent.get(block.agentId)
    if (blocks) blocks.push(block)
    else byAgent.set(block.agentId, [block])
  }

  let best: Slot | null = null
  for (const [agentId, blocks] of byAgent) {
    const start = firstGap(blocks, from, durationMs)
    if (best === null || start < best.start || (start === best.start && agentId < best.agentId)) {
      best = { agentId, start }
    }
  }
  return best
}

// Time: O(n log n); space: O(n). Copies before mutating, so the caller's blocks are never touched.
function mergeOverlaps(blocks: Busy[]): Busy[] {
  const sorted = blocks.filter((block) => block.end > block.start).sort((a, b) => a.start - b.start)

  const merged: Busy[] = []
  for (const block of sorted) {
    const last = merged[merged.length - 1]
    // `<=` not `<`: [0, 5) and [5, 9) leave a gap of length zero, so treat them as one block.
    if (last && block.start <= last.end) last.end = Math.max(last.end, block.end)
    else merged.push({ ...block })
  }
  return merged
}

function firstGap(blocks: Busy[], from: number, durationMs: number): number {
  // A zero-length slot [t, t) overlaps nothing under half-open semantics, so `from` always works.
  if (durationMs <= 0) return from

  let cursor = from
  for (const block of mergeOverlaps(blocks)) {
    if (block.end <= cursor) continue
    if (block.start - cursor >= durationMs) return cursor
    cursor = Math.max(cursor, block.end)
  }
  return cursor
}

// ---- Follow-up 1: working hours ----

type Shift = { agentId: string, start: number, end: number }

// Everything outside the shift is just more busy time, so the problem does not change shape: add
// two synthetic blocks per agent and reuse earliestSlot unchanged. This encoding assumes one shift
// per agent; with several you must complement the union of the shifts instead.
// Time: O(n log n); space: O(n).
export function earliestSlotInShift(
  busy: Busy[],
  shifts: Shift[],
  from: number,
  durationMs: number
): Slot | null {
  // Only rostered agents are schedulable. Without this filter an agent who appears in `busy` but
  // has no shift is treated as available around the clock, which is the opposite of the rule.
  const rostered = new Set(shifts.map(shift => shift.agentId))
  const blocked = busy.filter(block => rostered.has(block.agentId))
  for (const shift of shifts) {
    blocked.push({ agentId: shift.agentId, start: -Infinity, end: shift.start })
    blocked.push({ agentId: shift.agentId, start: shift.end, end: Infinity })
  }

  const slot = earliestSlot(blocked, from, durationMs)
  // An agent who never fits runs the cursor off to Infinity, which means no slot rather than one.
  return slot !== null && Number.isFinite(slot.start) ? slot : null
}

// ---- Follow-up 2: peak staffing ----

type Peak = { count: number, at: number | null }

// Sweep line: +1 at every start, -1 at every end, sorted, running sum, keep the max.
// Time: O(n log n) for the endpoint sort; space: O(n).
export function peakConcurrency(busy: Busy[]): Peak {
  const events: Array<[number, number]> = []
  for (const block of busy) {
    if (block.end <= block.start) continue
    events.push([block.start, 1], [block.end, -1])
  }

  // Half-open again: at an equal timestamp the -1 must land first, or a block finishing at 10:00
  // would be counted alongside one starting at 10:00.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  const peak: Peak = { count: 0, at: null }
  let running = 0
  for (const [time, delta] of events) {
    running += delta
    if (running > peak.count) {
      peak.count = running
      peak.at = time
    }
  }
  return peak
}

// ---- Follow-up 3: scale ----

// 5,000 agents x 200 intervals, queried on every escalation, is a million intervals sorted per call.
// Precompute instead: keep each agent's merged blocks sorted and stored, so a query binary searches
// for `from` and walks forward a handful of gaps, O(log m) per agent rather than O(m log m).
// Keep the agents in a heap keyed by their next free instant to avoid touching all 5,000.
// The cost is on writes: a booking invalidates that one agent's merged list (re-merge, O(m), or
// splice into it, O(m) worst case) and its heap key. That is the right trade when reads outnumber
// writes, which they do here. Cache the merged list per agent and version it, do not cache answers,
// because `from` and `durationMs` differ on every call.

// ---- Follow-up 4: book it ----

// Time: O(n log n) per booking; space: O(n).
export class Scheduler {
  private readonly busy: Busy[]

  constructor(busy: Busy[]) {
    this.busy = busy.map((block) => ({ ...block }))
  }

  book(from: number, durationMs: number): Slot | null {
    const slot = earliestSlot(this.busy, from, durationMs)
    if (slot === null) return null

    // Find and claim have to be one step. In one process that means not yielding between them, so
    // no await here. Across processes it means a conditional write: insert the booking only if the
    // agent still has no overlapping row, and retry the search when that write loses.
    this.busy.push({ agentId: slot.agentId, start: slot.start, end: slot.start + durationMs })
    return slot
  }
}

suite('earliest slot', () => {
  const busy: Busy[] = [
    { agentId: 'ana', start: 0, end: 30 },
    { agentId: 'ana', start: 40, end: 90 },
    { agentId: 'bo', start: 10, end: 50 }
  ]
  check('short slot fits before bo starts', earliestSlot(busy, 0, 10), { agentId: 'bo', start: 0 })
  check('longer slot waits for bo to finish', earliestSlot(busy, 0, 20), { agentId: 'bo', start: 50 })
  check('from is respected', earliestSlot(busy, 60, 20), { agentId: 'bo', start: 60 })
  check('slot can run past the last block', earliestSlot(busy, 0, 500), { agentId: 'bo', start: 50 })

  const messy: Busy[] = [
    { agentId: 'ana', start: 40, end: 90 },
    { agentId: 'ana', start: 0, end: 50 },
    { agentId: 'ana', start: 20, end: 30 }
  ]
  check('unsorted overlapping blocks merge', earliestSlot(messy, 0, 10), { agentId: 'ana', start: 90 })
  check('input not mutated', messy[0], { agentId: 'ana', start: 40, end: 90 })
})

suite('earliest slot edges', () => {
  check('no agents at all', earliestSlot([], 0, 10), null)

  const touching: Busy[] = [
    { agentId: 'ana', start: 0, end: 10 },
    { agentId: 'ana', start: 10, end: 20 }
  ]
  check('half-open: no usable gap at the join', earliestSlot(touching, 0, 5), { agentId: 'ana', start: 20 })

  const exact: Busy[] = [
    { agentId: 'ana', start: 0, end: 10 },
    { agentId: 'ana', start: 20, end: 30 }
  ]
  check('a gap of exactly the duration counts', earliestSlot(exact, 0, 10), { agentId: 'ana', start: 10 })
  check('one ms more does not', earliestSlot(exact, 0, 11), { agentId: 'ana', start: 30 })

  check('zero-length blocks ignored', earliestSlot([{ agentId: 'ana', start: 5, end: 5 }], 0, 10), {
    agentId: 'ana',
    start: 0
  })
  check('zero duration is free immediately', earliestSlot([{ agentId: 'ana', start: 0, end: 10 }], 0, 0), {
    agentId: 'ana',
    start: 0
  })

  const tie: Busy[] = [
    { agentId: 'zoe', start: 100, end: 200 },
    { agentId: 'ana', start: 100, end: 200 }
  ]
  check('ties go to the first agentId', earliestSlot(tie, 0, 50), { agentId: 'ana', start: 0 })
})

suite('follow-up 1: working hours', () => {
  const shifts: Shift[] = [
    { agentId: 'ana', start: 900, end: 1700 },
    { agentId: 'bo', start: 1300, end: 2100 }
  ]
  const busy: Busy[] = [{ agentId: 'ana', start: 900, end: 1650 }]

  check('before the shift does not count', earliestSlotInShift(busy, shifts, 800, 60), {
    agentId: 'bo',
    start: 1300
  })
  check('an agent with no blocks is still schedulable', earliestSlotInShift([], shifts, 0, 60), {
    agentId: 'ana',
    start: 900
  })
  check('nobody has a long enough shift', earliestSlotInShift(busy, shifts, 800, 5000), null)
})

suite('follow-up 2: peak staffing', () => {
  const busy: Busy[] = [
    { agentId: 'ana', start: 0, end: 30 },
    { agentId: 'bo', start: 10, end: 40 },
    { agentId: 'cy', start: 20, end: 25 }
  ]
  check('three at once', peakConcurrency(busy), { count: 3, at: 20 })

  const backToBack: Busy[] = [
    { agentId: 'ana', start: 0, end: 10 },
    { agentId: 'bo', start: 10, end: 20 }
  ]
  check('half-open: back to back is not concurrent', peakConcurrency(backToBack), { count: 1, at: 0 })
  check('nothing booked', peakConcurrency([]), { count: 0, at: null })
})

suite('follow-up 4: book it', () => {
  const scheduler = new Scheduler([
    { agentId: 'ana', start: 0, end: 100 },
    { agentId: 'bo', start: 0, end: 60 }
  ])
  check('first booking takes the earliest', scheduler.book(0, 30), { agentId: 'bo', start: 60 })
  check('second booking cannot reuse it', scheduler.book(0, 30), { agentId: 'bo', start: 90 })
  check('third booking moves to the other agent', scheduler.book(0, 30), { agentId: 'ana', start: 100 })
})

suite('only rostered agents are schedulable', () => {
  const shifts = [{ agentId: 'ana', start: 900, end: 1700 }]
  const busy = [{ agentId: 'cy', start: 0, end: 10 }, { agentId: 'ana', start: 900, end: 1000 }]
  // 'cy' has busy blocks but no shift. Treating a missing shift as "always available" inverts the
  // rule and hands the escalation to someone who is not working.
  check('unrostered agent is not offered', earliestSlotInShift(busy, shifts, 800, 60), { agentId: 'ana', start: 1000 })
  check('nobody rostered means no slot', earliestSlotInShift(busy, [], 800, 60), null)
})

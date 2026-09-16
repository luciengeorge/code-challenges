import { check, checkThrows, suite } from '../../lib/check'

type EventKind = 'message' | 'tool_call' | 'handoff'

type EventNode = {
  id: string
  at: number
  kind: EventKind
  next: EventNode | null
}

// An event with the pointer stripped off. Handy for tests and for serialising.
type EventFields = Omit<EventNode, 'next'>

// The loosest shape worth believing before normalising. `at` stays a union because the endpoint
// sends epoch milliseconds from one service and ISO strings from another.
type RawEvent = {
  id: string
  at: number | string
  kind?: unknown
}

// Decisions made up front:
// - Validate, do not trust. JSON.parse hands back `any`, which assigns to anything and then throws
//   at runtime. Everything crossing the boundary goes through a type predicate.
// - A malformed record is skipped, not fatal. This feeds a transcript view and one bad row should
//   not blank the screen. A billing job would throw on the batch instead, and I would say so.
// - An unrecognised kind becomes 'message'. Mislabelling one row beats losing it.
// - A record with no usable id or no usable timestamp is dropped: there is nothing to show and
//   nothing to sort it by.
// - Duplicate ids: the first occurrence wins.
// - Sort by `at` ascending, ties broken on id, because the endpoint never promised an order.
// - An empty array gives null, not an empty node.

// The type predicate. Say the words out loud. `in` narrows an unknown object one key at a time,
// which is how this gets written without a single `as`.
function isRawEvent(value: unknown): value is RawEvent {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || typeof value.id !== 'string' || value.id === '') return false
  if (!('at' in value)) return false
  return typeof value.at === 'number' || typeof value.at === 'string'
}

function isKind(value: unknown): value is EventKind {
  return value === 'message' || value === 'tool_call' || value === 'handoff'
}

// Accepts the bare array and the { data: [...] } envelope. Anything else is not a payload.
function toRecords(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object' && raw !== null && 'data' in raw && Array.isArray(raw.data)) {
    return raw.data
  }
  return []
}

function toTimestamp(value: number | string): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

// Time O(n log n) from the sort, space O(n).
export function normaliseEvents(raw: unknown): EventFields[] {
  const seen = new Set<string>()
  const events: EventFields[] = []

  for (const record of toRecords(raw)) {
    if (!isRawEvent(record)) continue
    const at = toTimestamp(record.at)
    if (at === null) continue
    if (seen.has(record.id)) continue
    seen.add(record.id)
    events.push({ id: record.id, at, kind: isKind(record.kind) ? record.kind : 'message' })
  }

  events.sort((a, b) => a.at - b.at || compareIds(a.id, b.id))
  return events
}

// Time O(n log n), space O(n). Dummy head plus a tail pointer, so every append is O(1). Walking from
// the head to find the end on each append is the O(n^2) trap this question is set to catch.
export function buildList(raw: unknown): EventNode | null {
  const dummy: EventNode = { id: '', at: 0, kind: 'message', next: null }
  let tail = dummy
  for (const event of normaliseEvents(raw)) {
    tail.next = { ...event, next: null }
    tail = tail.next
  }
  return dummy.next
}

// ---- Follow-up 1: reverse it ----

// Time O(n), space O(1). Three pointers, and the whole trick is holding `next` before overwriting
// the link you are about to need.
export function reverseList(head: EventNode | null): EventNode | null {
  let prev: EventNode | null = null
  let node = head
  while (node !== null) {
    const next = node.next
    node.next = prev
    prev = node
    node = next
  }
  return prev
}

// ---- Follow-up 2: detect a cycle ----

// Time O(n), space O(1). Fast moves two, slow moves one. On a loop the gap closes by one each step,
// so they always meet. The `!` on slow is safe: fast is ahead of it and still non-null.
export function hasLoop(head: EventNode | null): boolean {
  let slow = head
  let fast = head
  while (fast !== null && fast.next !== null) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}

// Time O(n), space O(1). The distance from the head to the loop start equals the distance from the
// meeting point to the loop start, so walking one pointer from each, one step at a time, lands them
// together on the first node of the loop.
export function findLoopStart(head: EventNode | null): EventNode | null {
  let slow = head
  let fast = head
  while (fast !== null && fast.next !== null) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) {
      let entry = head
      while (entry !== slow) {
        entry = entry!.next
        slow = slow!.next
      }
      return entry
    }
  }
  return null
}

// ---- Follow-up 3: merge two lists ----

// Time O(n + m), space O(1) beyond the relinking. The dummy head removes the "is this the first
// node?" branch: tail always points at a real node, so every append is the same two lines and there
// is no separate case for choosing the head.
// This relinks the input nodes rather than copying them, which consumes both inputs. Copy first if
// the caller still needs them.
export function mergeLists(a: EventNode | null, b: EventNode | null): EventNode | null {
  const dummy: EventNode = { id: '', at: 0, kind: 'message', next: null }
  let tail = dummy
  let left = a
  let right = b

  while (left !== null && right !== null) {
    // Ties take from the left list, which keeps the merge stable.
    if (left.at <= right.at) {
      tail.next = left
      left = left.next
    } else {
      tail.next = right
      right = right.next
    }
    tail = tail.next
  }

  // At most one list is left, and it is already sorted and already linked.
  tail.next = left ?? right
  return dummy.next
}

// ---- Follow-up 4: back to JSON ----

// Time O(n), space O(n). JSON.stringify(head) does technically work on an acyclic list, but it nests
// one object inside another for every event, so a thousand events give a thousand levels of braces
// and a reader on the other side that may well refuse them. Flattening to an array is what the
// caller wanted anyway.
// A list whose tail points back into the middle makes JSON.stringify throw rather than loop, and a
// hand-written walk loop forever, so check for the loop first and fail with a message you can read.
export function listToJSON(head: EventNode | null): string {
  if (hasLoop(head)) throw new Error('cyclic list cannot be serialised')
  const events: EventFields[] = []
  for (let node = head; node !== null; node = node.next) {
    events.push({ id: node.id, at: node.at, kind: node.kind })
  }
  return JSON.stringify(events)
}

// Test helper: a list is hard to read in a failure message, an array is not.
function listToArray(head: EventNode | null): EventFields[] {
  const out: EventFields[] = []
  for (let node = head; node !== null; node = node.next) {
    out.push({ id: node.id, at: node.at, kind: node.kind })
  }
  return out
}

const payload = {
  data: [
    { id: 'e3', at: '2024-01-01T00:00:05.000Z', kind: 'handoff' },
    { id: 'e1', at: 1704067200000, kind: 'message' },
    { id: 'e2', at: 1704067203000, kind: 'wat' },
    { id: 'e1', at: 1704067299000, kind: 'message' },
    { id: 'e4', kind: 'message' },
    { at: 1704067201000, kind: 'message' },
    null,
    'nope',
    42
  ]
}

suite('buildList', () => {
  check('the envelope, the ISO string, the unknown kind and the duplicate',
    listToArray(buildList(payload)), [
      { id: 'e1', at: 1704067200000, kind: 'message' },
      { id: 'e2', at: 1704067203000, kind: 'message' },
      { id: 'e3', at: 1704067205000, kind: 'handoff' }
    ])
  check('a bare array works too',
    listToArray(buildList([{ id: 'a', at: 2, kind: 'handoff' }, { id: 'b', at: 1 }])), [
      { id: 'b', at: 1, kind: 'message' },
      { id: 'a', at: 2, kind: 'handoff' }
    ])
  check('an empty array gives null, not an empty node', buildList([]), null)
  check('an empty envelope gives null', buildList({ data: [] }), null)
  check('null payload', buildList(null), null)
  check('a payload that is not a list at all', buildList({ data: 'nope' }), null)
  check('a string where the array should be', buildList('[]'), null)
  check('same timestamp, ties broken on id',
    listToArray(buildList([{ id: 'b', at: 7 }, { id: 'a', at: 7 }])), [
      { id: 'a', at: 7, kind: 'message' },
      { id: 'b', at: 7, kind: 'message' }
    ])
  check('an unparseable timestamp drops the record',
    listToArray(buildList([{ id: 'a', at: 'yesterday' }, { id: 'b', at: 1 }])), [
      { id: 'b', at: 1, kind: 'message' }
    ])
  check('a single event links to nothing',
    buildList([{ id: 'a', at: 1 }]), { id: 'a', at: 1, kind: 'message', next: null })
})

suite('reverseList', () => {
  check('three events turn round',
    listToArray(reverseList(buildList([
      { id: 'a', at: 1 },
      { id: 'b', at: 2 },
      { id: 'c', at: 3 }
    ]))), [
      { id: 'c', at: 3, kind: 'message' },
      { id: 'b', at: 2, kind: 'message' },
      { id: 'a', at: 1, kind: 'message' }
    ])
  check('one event is its own reverse',
    listToArray(reverseList(buildList([{ id: 'a', at: 1 }]))), [
      { id: 'a', at: 1, kind: 'message' }
    ])
  check('an empty list', reverseList(null), null)
})

suite('hasLoop and findLoopStart', () => {
  const straight = buildList([
    { id: 'a', at: 1 },
    { id: 'b', at: 2 },
    { id: 'c', at: 3 },
    { id: 'd', at: 4 }
  ])!

  // Build the damage on purpose: walk to the tail and point it back at the second node.
  const looped = buildList([
    { id: 'a', at: 1 },
    { id: 'b', at: 2 },
    { id: 'c', at: 3 },
    { id: 'd', at: 4 }
  ])!
  let tail = looped
  while (tail.next !== null) tail = tail.next
  tail.next = looped.next

  check('a straight list has no loop', hasLoop(straight), false)
  check('a single node has no loop', hasLoop(buildList([{ id: 'a', at: 1 }])), false)
  check('an empty list has no loop', hasLoop(null), false)
  check('the tail pointing into the middle', hasLoop(looped), true)
  check('the loop starts at b', findLoopStart(looped)?.id, 'b')
  check('no loop, no start', findLoopStart(straight), null)

  const selfLoop = buildList([{ id: 'only', at: 1 }])!
  selfLoop.next = selfLoop
  check('a node pointing at itself', hasLoop(selfLoop), true)
  check('and it is its own loop start', findLoopStart(selfLoop)?.id, 'only')
})

suite('mergeLists', () => {
  check('two sorted streams interleave', listToArray(mergeLists(
    buildList([{ id: 'a', at: 10 }, { id: 'c', at: 30 }]),
    buildList([{ id: 'b', at: 20 }, { id: 'd', at: 40 }])
  )), [
    { id: 'a', at: 10, kind: 'message' },
    { id: 'b', at: 20, kind: 'message' },
    { id: 'c', at: 30, kind: 'message' },
    { id: 'd', at: 40, kind: 'message' }
  ])
  check('a tie takes from the left first', listToArray(mergeLists(
    buildList([{ id: 'left', at: 5 }]),
    buildList([{ id: 'right', at: 5 }])
  )).map(event => event.id), ['left', 'right'])
  check('the leftovers are appended in one link', listToArray(mergeLists(
    buildList([{ id: 'a', at: 1 }]),
    buildList([{ id: 'b', at: 2 }, { id: 'c', at: 3 }])
  )).map(event => event.id), ['a', 'b', 'c'])
  check('one side empty', listToArray(mergeLists(null, buildList([{ id: 'a', at: 1 }])))
    .map(event => event.id), ['a'])
  check('both sides empty', mergeLists(null, null), null)
})

suite('listToJSON', () => {
  check('a flat array, not a thousand nested objects',
    listToJSON(buildList([{ id: 'a', at: 1 }, { id: 'b', at: 2, kind: 'handoff' }])),
    '[{"id":"a","at":1,"kind":"message"},{"id":"b","at":2,"kind":"handoff"}]')
  check('an empty list', listToJSON(null), '[]')

  const looped = buildList([{ id: 'a', at: 1 }, { id: 'b', at: 2 }])!
  looped.next!.next = looped

  checkThrows('a cyclic list is refused rather than walked',
    () => listToJSON(looped), 'cyclic list')
  // The runtime will not save you either: this is a thrown TypeError, not a hang.
  checkThrows('JSON.stringify itself throws on the cycle',
    () => JSON.stringify(looped), /cyclic|circular/i)
})

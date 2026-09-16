import { check, suite } from '../../lib/check'

type EventKind = 'message' | 'tool_call' | 'handoff'

type EventNode = {
  id: string
  at: number
  kind: EventKind
  next: EventNode | null
}

type EventFields = Omit<EventNode, 'next'>

export function buildList(raw: unknown): EventNode | null {
  throw new Error('not implemented')
}

// `check` needs a value and an unimplemented function throws before it can produce one, so trap the
// throw and let the message show up as the failure.
function attempt<T>(fn: () => T): T | string {
  try {
    return fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
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
    attempt(() => listToArray(buildList(payload))), [
      { id: 'e1', at: 1704067200000, kind: 'message' },
      { id: 'e2', at: 1704067203000, kind: 'message' },
      { id: 'e3', at: 1704067205000, kind: 'handoff' }
    ])
  check('a bare array works too',
    attempt(() => listToArray(buildList([{ id: 'a', at: 2, kind: 'handoff' }, { id: 'b', at: 1 }]))), [
      { id: 'b', at: 1, kind: 'message' },
      { id: 'a', at: 2, kind: 'handoff' }
    ])
  check('an empty array gives null, not an empty node', attempt(() => buildList([])), null)
  check('an empty envelope gives null', attempt(() => buildList({ data: [] })), null)
  check('null payload', attempt(() => buildList(null)), null)
  check('a payload that is not a list at all', attempt(() => buildList({ data: 'nope' })), null)
  check('a string where the array should be', attempt(() => buildList('[]')), null)
  check('same timestamp, ties broken on id',
    attempt(() => listToArray(buildList([{ id: 'b', at: 7 }, { id: 'a', at: 7 }]))), [
      { id: 'a', at: 7, kind: 'message' },
      { id: 'b', at: 7, kind: 'message' }
    ])
  check('an unparseable timestamp drops the record',
    attempt(() => listToArray(buildList([{ id: 'a', at: 'yesterday' }, { id: 'b', at: 1 }]))), [
      { id: 'b', at: 1, kind: 'message' }
    ])
  check('a single event links to nothing',
    attempt(() => buildList([{ id: 'a', at: 1 }])),
    { id: 'a', at: 1, kind: 'message', next: null })
})

// FOLLOW-UP 1: write reverseList(head), then uncomment.
// suite('reverseList', () => {
//   check('three events turn round',
//     listToArray(reverseList(buildList([
//       { id: 'a', at: 1 },
//       { id: 'b', at: 2 },
//       { id: 'c', at: 3 }
//     ]))), [
//       { id: 'c', at: 3, kind: 'message' },
//       { id: 'b', at: 2, kind: 'message' },
//       { id: 'a', at: 1, kind: 'message' }
//     ])
//   check('one event is its own reverse',
//     listToArray(reverseList(buildList([{ id: 'a', at: 1 }]))), [
//       { id: 'a', at: 1, kind: 'message' }
//     ])
//   check('an empty list', reverseList(null), null)
// })

// FOLLOW-UP 2: write hasLoop(head) and findLoopStart(head), then uncomment.
// suite('hasLoop and findLoopStart', () => {
//   const straight = buildList([
//     { id: 'a', at: 1 },
//     { id: 'b', at: 2 },
//     { id: 'c', at: 3 },
//     { id: 'd', at: 4 }
//   ])!
//
//   const looped = buildList([
//     { id: 'a', at: 1 },
//     { id: 'b', at: 2 },
//     { id: 'c', at: 3 },
//     { id: 'd', at: 4 }
//   ])!
//   let tail = looped
//   while (tail.next !== null) tail = tail.next
//   tail.next = looped.next
//
//   check('a straight list has no loop', hasLoop(straight), false)
//   check('a single node has no loop', hasLoop(buildList([{ id: 'a', at: 1 }])), false)
//   check('an empty list has no loop', hasLoop(null), false)
//   check('the tail pointing into the middle', hasLoop(looped), true)
//   check('the loop starts at b', findLoopStart(looped)?.id, 'b')
//   check('no loop, no start', findLoopStart(straight), null)
//
//   const selfLoop = buildList([{ id: 'only', at: 1 }])!
//   selfLoop.next = selfLoop
//   check('a node pointing at itself', hasLoop(selfLoop), true)
//   check('and it is its own loop start', findLoopStart(selfLoop)?.id, 'only')
// })

// FOLLOW-UP 3: write mergeLists(a, b), then uncomment.
// suite('mergeLists', () => {
//   check('two sorted streams interleave', listToArray(mergeLists(
//     buildList([{ id: 'a', at: 10 }, { id: 'c', at: 30 }]),
//     buildList([{ id: 'b', at: 20 }, { id: 'd', at: 40 }])
//   )), [
//     { id: 'a', at: 10, kind: 'message' },
//     { id: 'b', at: 20, kind: 'message' },
//     { id: 'c', at: 30, kind: 'message' },
//     { id: 'd', at: 40, kind: 'message' }
//   ])
//   check('a tie takes from the left first', listToArray(mergeLists(
//     buildList([{ id: 'left', at: 5 }]),
//     buildList([{ id: 'right', at: 5 }])
//   )).map(event => event.id), ['left', 'right'])
//   check('the leftovers are appended in one link', listToArray(mergeLists(
//     buildList([{ id: 'a', at: 1 }]),
//     buildList([{ id: 'b', at: 2 }, { id: 'c', at: 3 }])
//   )).map(event => event.id), ['a', 'b', 'c'])
//   check('one side empty', listToArray(mergeLists(null, buildList([{ id: 'a', at: 1 }])))
//     .map(event => event.id), ['a'])
//   check('both sides empty', mergeLists(null, null), null)
// })

// FOLLOW-UP 4: write listToJSON(head), which must refuse a cyclic list rather than walk it.
// Needs checkThrows adding to the import. Then uncomment.
// suite('listToJSON', () => {
//   check('a flat array, not a thousand nested objects',
//     listToJSON(buildList([{ id: 'a', at: 1 }, { id: 'b', at: 2, kind: 'handoff' }])),
//     '[{"id":"a","at":1,"kind":"message"},{"id":"b","at":2,"kind":"handoff"}]')
//   check('an empty list', listToJSON(null), '[]')
//
//   const looped = buildList([{ id: 'a', at: 1 }, { id: 'b', at: 2 }])!
//   looped.next!.next = looped
//
//   checkThrows('a cyclic list is refused rather than walked',
//     () => listToJSON(looped), 'cyclic list')
//   checkThrows('JSON.stringify itself throws on the cycle',
//     () => JSON.stringify(looped), /cyclic|circular/i)
// })

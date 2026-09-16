import { check, suite } from '../../lib/check'

type Sheet = Record<string, string>

export function hasCycle(sheet: Sheet): boolean {
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

const cyclic: Sheet = {
  A1: '5',
  A2: '=A1+B1',
  B1: '=C1*2',
  C1: '=A2'
}

const diamond: Sheet = {
  A1: '5',
  A2: '=A1*2',
  A3: '=A1+1',
  A4: '=A2+A3'
}

suite('hasCycle', () => {
  check('a three-cell loop', attempt(() => hasCycle(cyclic)), true)
  check('the diamond is not a cycle', attempt(() => hasCycle(diamond)), false)
  check('a cell that reads itself', attempt(() => hasCycle({ A1: '=A1' })), true)
  check('a two-cell loop', attempt(() => hasCycle({ A1: '=B1', B1: '=A1' })), true)
  check('a long chain with no loop',
    attempt(() => hasCycle({ A1: '1', A2: '=A1', A3: '=A2', A4: '=A3', A5: '=A4' })), false)
  check('literals only', attempt(() => hasCycle({ A1: '5', B1: 'hello' })), false)
  check('empty sheet', attempt(() => hasCycle({})), false)
  check('a reference to a missing cell is an empty cell, not a loop',
    attempt(() => hasCycle({ A1: '=ZZ99' })), false)
  check('references are case-insensitive',
    attempt(() => hasCycle({ A1: '=b1', B1: '=a1' })), true)
  check('the same cell named twice is one edge',
    attempt(() => hasCycle({ A1: '5', B1: '=A1+A1' })), false)
  check('a clean component next to a dirty one',
    attempt(() => hasCycle({ A1: '1', A2: '=A1', B1: '=B2', B2: '=B1' })), true)
})

// FOLLOW-UP 1: write findCycle(sheet) returning the path or null, then uncomment.
// suite('findCycle', () => {
//   check('the cells to cut, not a flag', findCycle(cyclic), ['A2', 'B1', 'C1', 'A2'])
//   check('the diamond gives no cycle', findCycle(diamond), null)
//   check('a self reference is a loop of one', findCycle({ A1: '=A1' }), ['A1', 'A1'])
//   check('the lead-in is excluded', findCycle({
//     A1: '1',
//     A2: '=A1+B1',
//     B1: '=A2'
//   }), ['A2', 'B1', 'A2'])
//   check('empty sheet', findCycle({}), null)
// })

// FOLLOW-UP 2: write evaluate(sheet) returning a number or '#CIRCULAR!' per cell, then uncomment.
// suite('evaluate', () => {
//   check('values in dependency order', evaluate({
//     A1: '5',
//     B1: '2',
//     A2: '=A1+B1',
//     C1: '=A2*2'
//   }), { A1: 5, B1: 2, A2: 7, C1: 14 })
//   check('the loop and everything downstream of it', evaluate({
//     A1: '5',
//     A2: '=A1+B1',
//     B1: '=C1*2',
//     C1: '=A2',
//     D1: '=C1+1'
//   }), { A1: 5, A2: '#CIRCULAR!', B1: '#CIRCULAR!', C1: '#CIRCULAR!', D1: '#CIRCULAR!' })
//   check('the diamond evaluates fine', evaluate(diamond), { A1: 5, A2: 10, A3: 6, A4: 16 })
//   check('a missing cell reads as zero', evaluate({ A1: '=ZZ99+7' }), { A1: 7 })
//   check('text is zero', evaluate({ A1: 'hello', B1: '=A1+3' }), { A1: 0, B1: 3 })
//   check('empty sheet', evaluate({}), {})
// })

// FOLLOW-UP 3: write cellsToRecalculate(sheet, changed), then uncomment.
// Needs checkThrows adding to the import.
// suite('cellsToRecalculate', () => {
//   const sheet: Sheet = {
//     A1: '5',
//     A2: '=A1*2',
//     A3: '=A2+1',
//     B1: '=A1-1',
//     Z1: '99'
//   }
//   check('everything downstream, in an order you can recompute in',
//     cellsToRecalculate(sheet, 'A1'), ['B1', 'A2', 'A3'])
//   check('a mid-chain edit leaves the cells above it alone',
//     cellsToRecalculate(sheet, 'A2'), ['A3'])
//   check('nothing reads a leaf', cellsToRecalculate(sheet, 'A3'), [])
//   check('an untouched cell has no dependents', cellsToRecalculate(sheet, 'Z1'), [])
//   check('typing into a previously empty cell still finds its readers',
//     cellsToRecalculate({ B1: '=Q7' }, 'Q7'), ['B1'])
//   checkThrows('a cyclic sheet has no recompute order',
//     () => cellsToRecalculate(cyclic, 'A1'), 'cycle detected')
// })

// FOLLOW-UP 4: write cellsInRange(from, to), referencesWithRanges(contents) and
// hasCycleWithRanges(sheet), then uncomment.
// suite('ranges', () => {
//   check('a column range', cellsInRange('B1', 'B5'), ['B1', 'B2', 'B3', 'B4', 'B5'])
//   check('a rectangle, columns outer', cellsInRange('A1', 'B2'), ['A1', 'A2', 'B1', 'B2'])
//   check('reversed corners give the same cells', cellsInRange('B2', 'A1'), ['A1', 'A2', 'B1', 'B2'])
//   check('columns past Z', cellsInRange('Z1', 'AA1'), ['Z1', 'AA1'])
//   check('a range plus a lone cell',
//     referencesWithRanges('=SUM(B1:B3)+D7'), ['B1', 'B2', 'B3', 'D7'])
//
//   const throughTheMiddle: Sheet = {
//     B1: '1',
//     B2: '=D1',
//     B3: '3',
//     D1: '=SUM(B1:B3)'
//   }
//   check('a loop through the middle of a range', hasCycleWithRanges(throughTheMiddle), true)
//   check('the endpoint-only parser misses it', hasCycle(throughTheMiddle), false)
//   check('a range with no loop in it',
//     hasCycleWithRanges({ B1: '1', B2: '2', B3: '3', D1: '=SUM(B1:B3)' }), false)
// })

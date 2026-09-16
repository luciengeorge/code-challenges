import { check, checkThrows, suite } from '../../lib/check'

type Sheet = Record<string, string>

// Decisions made up front:
// - A formula is any cell whose contents start with '='. Everything else is a literal.
// - References are whatever matches /[A-Z]+\d+/. The formula is a bag of cell names, not an
//   expression tree. Say that out loud; nobody wants an expression parser in 45 minutes.
// - Cell names are case-insensitive, so 'a1' and 'A1' are the same cell.
// - A reference to a cell that is not in the sheet is an empty cell, not an error. Spreadsheets
//   behave that way and it keeps the graph total.
// - '=A1+A1' names A1 twice. That is one edge repeated, which changes nothing.

function normalise(cell: string): string {
  return cell.toUpperCase()
}

function referencesOf(contents: string): string[] {
  if (!contents.startsWith('=')) return []
  return contents.toUpperCase().match(/[A-Z]+\d+/g) ?? []
}

// Time O(V + E), space O(V + E). Keys that normalise to the same cell are a malformed sheet; the
// last one wins rather than throwing, because the sheet is the user's, not ours.
function buildRefs(sheet: Sheet): Map<string, string[]> {
  const refs = new Map<string, string[]>()
  for (const [cell, contents] of Object.entries(sheet)) {
    refs.set(normalise(cell), referencesOf(contents))
  }
  // Give every referenced-but-absent cell an entry so lookups never come back undefined.
  for (const list of [...refs.values()]) {
    for (const ref of list) if (!refs.has(ref)) refs.set(ref, [])
  }
  return refs
}

// Time O(V + E), space O(V) plus the recursion stack.
// Three colours: absent from `state` is white, 'active' is grey (on the path we are walking now),
// 'done' is black. Reaching a grey cell closes a cycle. Reaching a black cell is a diamond, which
// is two cells sharing a dependency, and is perfectly legal. A single visited set cannot tell those
// two apart and reports a cycle that is not there.
export function hasCycle(sheet: Sheet): boolean {
  const refs = buildRefs(sheet)
  const state = new Map<string, 'active' | 'done'>()

  // Recursive because it reads better. A sheet deep enough to blow the stack is already broken, but
  // say the words "explicit stack" if the interviewer asks how big the sheet can get.
  function visit(cell: string): boolean {
    state.set(cell, 'active')
    for (const ref of refs.get(cell)!) {
      if (state.get(ref) === 'active') return true
      if (!state.has(ref) && visit(ref)) return true
    }
    state.set(cell, 'done')
    return false
  }

  for (const cell of refs.keys()) {
    if (!state.has(cell) && visit(cell)) return true
  }
  return false
}

// ---- Follow-up 1: which cells ----

// Time O(V + E), space O(V). The path runs in reference direction and repeats the node that closes
// it, so ['A2', 'B1', 'C1', 'A2'] means A2 reads B1, B1 reads C1, and C1 reads A2 again.
export function findCycle(sheet: Sheet): string[] | null {
  const refs = buildRefs(sheet)
  const state = new Map<string, 'active' | 'done'>()
  const path: string[] = []

  function visit(cell: string): string[] | null {
    state.set(cell, 'active')
    path.push(cell)
    for (const ref of refs.get(cell)!) {
      // Slice from where the repeated cell first appears, so the lead-in is not reported as part of
      // the loop.
      if (state.get(ref) === 'active') return [...path.slice(path.indexOf(ref)), ref]
      if (!state.has(ref)) {
        const cycle = visit(ref)
        if (cycle !== null) return cycle
      }
    }
    path.pop()
    state.set(cell, 'done')
    return null
  }

  for (const cell of refs.keys()) {
    if (state.has(cell)) continue
    const cycle = visit(cell)
    if (cycle !== null) return cycle
  }
  return null
}

// ---- Follow-up 2: evaluate it ----

type CellValue = number | '#CIRCULAR!'

// Time O(V + E) over the formula text, space O(V). The same three colours drive the evaluation:
// hitting a grey cell means this value depends on itself, so it and everything that reads it are
// '#CIRCULAR!'. Memoising on the way out gives each cell exactly one evaluation.
export function evaluate(sheet: Sheet): Record<string, CellValue> {
  const contentsOf = new Map<string, string>()
  for (const [cell, contents] of Object.entries(sheet)) contentsOf.set(normalise(cell), contents)

  const state = new Map<string, 'active' | 'done'>()
  const values = new Map<string, CellValue>()

  function valueOf(cell: string): CellValue {
    if (state.get(cell) === 'active') return '#CIRCULAR!'
    const cached = values.get(cell)
    if (cached !== undefined) return cached

    state.set(cell, 'active')
    const value = compute(contentsOf.get(cell) ?? '')
    state.set(cell, 'done')
    values.set(cell, value)
    return value
  }

  function compute(contents: string): CellValue {
    if (!contents.startsWith('=')) {
      // A literal that is not a number counts as zero, the same as an empty cell.
      const literal = Number(contents.trim())
      return Number.isFinite(literal) ? literal : 0
    }

    // Left to right, no operator precedence. That is a deliberate simplification of the formula
    // language, not a bug: the question is about the dependency graph.
    const tokens: string[] = contents.slice(1).toUpperCase().match(/[A-Z]+\d+|\d+(?:\.\d+)?|[+\-*/]/g) ?? []
    if (tokens.length === 0) return 0

    let total = operand(tokens[0])
    if (total === '#CIRCULAR!') return total
    for (let i = 1; i + 1 < tokens.length; i += 2) {
      const right = operand(tokens[i + 1])
      if (right === '#CIRCULAR!') return right
      total = apply(tokens[i], total, right)
    }
    return total
  }

  function operand(token: string): CellValue {
    return /^[A-Z]+\d+$/.test(token) ? valueOf(token) : Number(token)
  }

  // Only cells the sheet actually holds are reported. Referenced-but-absent cells stay empty.
  const out: Record<string, CellValue> = {}
  for (const cell of contentsOf.keys()) out[cell] = valueOf(cell)
  return out
}

function apply(op: string, left: number, right: number): number {
  if (op === '+') return left + right
  if (op === '-') return left - right
  if (op === '*') return left * right
  return left / right
}

// ---- Follow-up 3: recalculate on edit ----

// Time O(V + E), space O(V + E). This needs the graph pointed the other way round: cycle detection
// walks cell -> what it reads, recalculation walks cell -> who reads it. Build that reverse
// dependency graph once and an edit is a traversal from the edited cell, not a rescan of the sheet.
// The reverse graph is keyed on referenced names rather than sheet keys, so typing a value into a
// previously empty cell still finds the formulas that were already pointing at it.
export function cellsToRecalculate(sheet: Sheet, changed: string): string[] {
  if (hasCycle(sheet)) throw new Error('cycle detected')
  const refs = buildRefs(sheet)

  const dependents = new Map<string, string[]>()
  for (const [cell, list] of refs) {
    for (const ref of list) {
      const existing = dependents.get(ref)
      if (existing === undefined) dependents.set(ref, [cell])
      else if (!existing.includes(cell)) existing.push(cell)
    }
  }

  // Reverse post-order of the reverse graph is a topological order of the affected cells, so the
  // caller can recompute straight down the list. The edited cell is left out: its new value is the
  // input, not something to recompute.
  const seen = new Set<string>()
  const order: string[] = []

  function visit(cell: string): void {
    seen.add(cell)
    for (const dependent of dependents.get(cell) ?? []) {
      if (!seen.has(dependent)) visit(dependent)
    }
    order.push(cell)
  }

  visit(normalise(changed))
  return order.reverse().slice(1)
}

// ---- Follow-up 4: ranges ----

// What changes: only the reference extraction. '=SUM(B1:B5)' is five edges, not two, and a naive
// /[A-Z]+\d+/ quietly sees B1 and B5 while missing B2, B3 and B4, so a cycle running through the
// middle of a range goes unreported.
// What does not change: the graph, the three-colour DFS, the evaluation order, or the complexity in
// the number of edges. A range is a compact way of writing edges, nothing more.
// The cost is that E grows with the area of the range, so '=SUM(A1:Z999)' is 25,974 edges from one
// cell, and a sheet full of those wants ranges as first-class nodes rather than expanded.
// Worth naming as a known hole: a function name with a trailing digit, such as LOG10(A1), also
// matches the reference pattern. Real code anchors on a proper tokeniser.

function columnToNumber(column: string): number {
  let value = 0
  for (const letter of column) value = value * 26 + (letter.charCodeAt(0) - 64)
  return value
}

function numberToColumn(value: number): string {
  let column = ''
  let left = value
  while (left > 0) {
    column = String.fromCharCode(65 + ((left - 1) % 26)) + column
    left = Math.floor((left - 1) / 26)
  }
  return column
}

// Time and space O(width * height) in the cells the range names. Columns outer, rows inner.
export function cellsInRange(from: string, to: string): string[] {
  const start = splitCell(from)
  const end = splitCell(to)
  const cells: string[] = []
  for (let column = Math.min(start.column, end.column); column <= Math.max(start.column, end.column); column++) {
    for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row++) {
      cells.push(`${numberToColumn(column)}${row}`)
    }
  }
  return cells
}

function splitCell(cell: string): { column: number, row: number } {
  const match = cell.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (match === null) throw new Error(`not a cell reference: ${cell}`)
  return { column: columnToNumber(match[1]), row: Number(match[2]) }
}

export function referencesWithRanges(contents: string): string[] {
  if (!contents.startsWith('=')) return []
  const cells: string[] = []
  for (const token of contents.toUpperCase().match(/[A-Z]+\d+:[A-Z]+\d+|[A-Z]+\d+/g) ?? []) {
    if (token.includes(':')) {
      const [from, to] = token.split(':')
      cells.push(...cellsInRange(from, to))
    } else {
      cells.push(token)
    }
  }
  return cells
}

// Same algorithm as hasCycle, reading the range-aware reference list. Time O(V + E) with E counted
// after expansion.
export function hasCycleWithRanges(sheet: Sheet): boolean {
  const expanded: Sheet = {}
  for (const [cell, contents] of Object.entries(sheet)) {
    // Rewriting each formula as a plain list of its cells lets the original parser take over.
    expanded[normalise(cell)] = contents.startsWith('=')
      ? `=${referencesWithRanges(contents).join('+')}`
      : contents
  }
  return hasCycle(expanded)
}

const cyclic: Sheet = {
  A1: '5',
  A2: '=A1+B1',
  B1: '=C1*2',
  C1: '=A2'
}

// The trap: A2 and A3 both read A1. The second time the DFS reaches A1 it is already 'done', which
// is a shared dependency, not a loop. A single visited set calls this a cycle.
const diamond: Sheet = {
  A1: '5',
  A2: '=A1*2',
  A3: '=A1+1',
  A4: '=A2+A3'
}

suite('hasCycle', () => {
  check('a three-cell loop', hasCycle(cyclic), true)
  check('the diamond is not a cycle', hasCycle(diamond), false)
  check('a cell that reads itself', hasCycle({ A1: '=A1' }), true)
  check('a two-cell loop', hasCycle({ A1: '=B1', B1: '=A1' }), true)
  check('a long chain with no loop',
    hasCycle({ A1: '1', A2: '=A1', A3: '=A2', A4: '=A3', A5: '=A4' }), false)
  check('literals only', hasCycle({ A1: '5', B1: 'hello' }), false)
  check('empty sheet', hasCycle({}), false)
  check('a reference to a missing cell is an empty cell, not a loop',
    hasCycle({ A1: '=ZZ99' }), false)
  check('references are case-insensitive', hasCycle({ A1: '=b1', B1: '=a1' }), true)
  check('the same cell named twice is one edge', hasCycle({ A1: '5', B1: '=A1+A1' }), false)
  check('a clean component next to a dirty one',
    hasCycle({ A1: '1', A2: '=A1', B1: '=B2', B2: '=B1' }), true)
})

suite('findCycle', () => {
  check('the cells to cut, not a flag', findCycle(cyclic), ['A2', 'B1', 'C1', 'A2'])
  check('the diamond gives no cycle', findCycle(diamond), null)
  check('a self reference is a loop of one', findCycle({ A1: '=A1' }), ['A1', 'A1'])
  check('the lead-in is excluded', findCycle({
    A1: '1',
    A2: '=A1+B1',
    B1: '=A2'
  }), ['A2', 'B1', 'A2'])
  check('empty sheet', findCycle({}), null)
})

suite('evaluate', () => {
  check('values in dependency order', evaluate({
    A1: '5',
    B1: '2',
    A2: '=A1+B1',
    C1: '=A2*2'
  }), { A1: 5, B1: 2, A2: 7, C1: 14 })
  check('the loop and everything downstream of it', evaluate({
    A1: '5',
    A2: '=A1+B1',
    B1: '=C1*2',
    C1: '=A2',
    D1: '=C1+1'
  }), { A1: 5, A2: '#CIRCULAR!', B1: '#CIRCULAR!', C1: '#CIRCULAR!', D1: '#CIRCULAR!' })
  check('the diamond evaluates fine', evaluate(diamond), { A1: 5, A2: 10, A3: 6, A4: 16 })
  check('a missing cell reads as zero', evaluate({ A1: '=ZZ99+7' }), { A1: 7 })
  check('text is zero', evaluate({ A1: 'hello', B1: '=A1+3' }), { A1: 0, B1: 3 })
  check('empty sheet', evaluate({}), {})
})

suite('cellsToRecalculate', () => {
  const sheet: Sheet = {
    A1: '5',
    A2: '=A1*2',
    A3: '=A2+1',
    B1: '=A1-1',
    Z1: '99'
  }
  check('everything downstream, in an order you can recompute in',
    cellsToRecalculate(sheet, 'A1'), ['B1', 'A2', 'A3'])
  check('a mid-chain edit leaves the cells above it alone',
    cellsToRecalculate(sheet, 'A2'), ['A3'])
  check('nothing reads a leaf', cellsToRecalculate(sheet, 'A3'), [])
  check('an untouched cell has no dependents', cellsToRecalculate(sheet, 'Z1'), [])
  check('typing into a previously empty cell still finds its readers',
    cellsToRecalculate({ B1: '=Q7' }, 'Q7'), ['B1'])
  checkThrows('a cyclic sheet has no recompute order',
    () => cellsToRecalculate(cyclic, 'A1'), 'cycle detected')
})

suite('ranges', () => {
  check('a column range', cellsInRange('B1', 'B5'), ['B1', 'B2', 'B3', 'B4', 'B5'])
  check('a rectangle, columns outer', cellsInRange('A1', 'B2'), ['A1', 'A2', 'B1', 'B2'])
  check('reversed corners give the same cells', cellsInRange('B2', 'A1'), ['A1', 'A2', 'B1', 'B2'])
  check('columns past Z', cellsInRange('Z1', 'AA1'), ['Z1', 'AA1'])
  check('a range plus a lone cell',
    referencesWithRanges('=SUM(B1:B3)+D7'), ['B1', 'B2', 'B3', 'D7'])

  // The loop runs through B2, which is inside the range but is neither endpoint.
  const throughTheMiddle: Sheet = {
    B1: '1',
    B2: '=D1',
    B3: '3',
    D1: '=SUM(B1:B3)'
  }
  check('a loop through the middle of a range', hasCycleWithRanges(throughTheMiddle), true)
  check('the endpoint-only parser misses it', hasCycle(throughTheMiddle), false)
  check('a range with no loop in it',
    hasCycleWithRanges({ B1: '1', B2: '2', B3: '3', D1: '=SUM(B1:B3)' }), false)
})

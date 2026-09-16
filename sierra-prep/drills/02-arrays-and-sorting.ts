import { check, checkThrows, suite } from '../lib/check'

export type Comparator<T> = (a: T, b: T) => number
export type Direction = 'asc' | 'desc'
type SortKey = string | number

function compareKeys(a: SortKey, b: SortKey): number {
  if (typeof a !== typeof b) throw new Error('Sort keys must have the same type')
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Sort keys cannot be NaN')
  // Relational comparison handles strings and infinities without subtraction's NaN trap.
  return a < b ? -1 : a > b ? 1 : 0
}

export function byKey<T>(key: (item: T) => SortKey, direction: Direction = 'asc'): Comparator<T> {
  return (a, b) => {
    const order = compareKeys(key(a), key(b))
    return direction === 'asc' ? order : -order
  }
}

// O(k) time per comparison and O(k) space to retain k comparators.
export function thenBy<T>(...comparators: Comparator<T>[]): Comparator<T> {
  return (a, b) => {
    for (const compare of comparators) {
      const order = compare(a, b)
      if (order !== 0) return order
    }
    return 0
  }
}

// Typically O(k * n log n) time and O(n + k) space, assuming O(1) selectors/comparisons.
export function sortBy<T>(items: readonly T[], ...comparators: Comparator<T>[]): T[] {
  return [...items].sort(thenBy(...comparators))
}

// O(n) time and O(n) space, assuming an O(1) predicate.
export function partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = []
  const no: T[] = []
  for (const item of items) {
    if (predicate(item)) yes.push(item)
    else no.push(item)
  }
  return [yes, no]
}

// Expected O(n) time and O(n) space. The first item for each key wins.
export function uniqueBy<T, K>(items: readonly T[], key: (item: T) => K): T[] {
  const seen = new Set<K>()
  const result: T[] = []
  for (const item of items) {
    const value = key(item)
    if (!seen.has(value)) {
      seen.add(value)
      result.push(item)
    }
  }
  return result
}

// O(n) time and O(n) space, including the returned chunks.
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Chunk size must be a positive safe integer')
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

// O(min(n, m)) time and space. Stop at the shorter input, without padding.
export function zip<A, B>(left: readonly A[], right: readonly B[]): [A, B][] {
  const result: [A, B][] = []
  for (let i = 0; i < Math.min(left.length, right.length); i++) result.push([left[i], right[i]])
  return result
}

// O(n) time and O(1) extra space, assuming an O(1) selector.
export function sumBy<T>(items: readonly T[], value: (item: T) => number): number {
  let sum = 0
  for (const item of items) sum += value(item)
  return sum
}

// O(n) time and O(1) extra space. Ties keep the first item; NaN scores are rejected.
export function maxBy<T>(items: readonly T[], score: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined
  let best = items[0]
  let bestScore = score(best)
  if (Number.isNaN(bestScore)) throw new Error('Score cannot be NaN')
  for (let i = 1; i < items.length; i++) {
    const nextScore = score(items[i])
    if (Number.isNaN(nextScore)) throw new Error('Score cannot be NaN')
    if (nextScore > bestScore) {
      best = items[i]
      bestScore = nextScore
    }
  }
  return best
}

// O(r) time and space for r output values. End-exclusive; a step pointing away gives [].
export function range(start: number, end: number, step = 1): number[] {
  if (![start, end, step].every(Number.isSafeInteger) || step === 0) {
    throw new Error('Range needs safe integers and a non-zero step')
  }
  const result: number[] = []
  for (let value = start; step > 0 ? value < end : value > end; value += step) result.push(value)
  return result
}

// O(n) time and space. Positive steps rotate right; negative steps rotate left.
export function rotate<T>(items: readonly T[], steps: number): T[] {
  if (!Number.isSafeInteger(steps)) throw new Error('Rotation must be a safe integer')
  if (items.length === 0) return []
  const offset = ((steps % items.length) + items.length) % items.length
  return [...items.slice(items.length - offset), ...items.slice(0, items.length - offset)]
}

// Expected O(n + m) time and space. Set semantics: return each shared key once, in left order.
export function intersectionBy<T, K>(left: readonly T[], right: readonly T[], key: (item: T) => K): T[] {
  const rightKeys = new Set(right.map(key))
  return uniqueBy(left, key).filter(item => rightKeys.has(key(item)))
}

// Expected O(n + m) time and space. Return each left-only key once, keeping its first item.
export function differenceBy<T, K>(left: readonly T[], right: readonly T[], key: (item: T) => K): T[] {
  const rightKeys = new Set(right.map(key))
  return uniqueBy(left, key).filter(item => !rightKeys.has(key(item)))
}

suite('sorting and comparator composition', () => {
  type Ticket = { id: string, priority: number, customer: string }
  const tickets: Ticket[] = [
    { id: 'a', priority: 2, customer: 'Zoe' },
    { id: 'b', priority: 1, customer: 'Bea' },
    { id: 'c', priority: 2, customer: 'Ada' },
    { id: 'd', priority: 2, customer: 'Ada' }
  ]
  const priority = byKey<Ticket>(ticket => ticket.priority, 'desc')
  const customer = byKey<Ticket>(ticket => ticket.customer)
  check('multiple keys and directions', sortBy(tickets, priority, customer).map(ticket => ticket.id), ['c', 'd', 'a', 'b'])
  check('sortBy leaves its input alone', tickets.map(ticket => ticket.id), ['a', 'b', 'c', 'd'])
  check('thenBy stops at the first non-zero result', thenBy(priority, customer)(tickets[0], tickets[1]), -1)
  check('ties return zero', thenBy(priority, customer)(tickets[2], tickets[3]), 0)
  check('reversing operands reverses the sign', customer(tickets[1], tickets[0]), -customer(tickets[0], tickets[1]))
  check('empty sort', sortBy([], byKey((value: number) => value)), [])
  check('no comparators keeps input order', sortBy([3, 1, 2]), [3, 1, 2])

  // Stable sorting preserves ties: sort the least significant key first when chaining sorts.
  const chained = [...tickets].sort(customer).sort(priority)
  check('stable chained sorts match a composed comparator', chained, sortBy(tickets, priority, customer))
  check('equal keys retain their original order', chained.filter(ticket => ticket.customer === 'Ada').map(ticket => ticket.id), ['c', 'd'])

  check('default sort is lexicographic, even for numbers', [10, 9, 1].sort(), [1, 10, 9])
  check('numeric subtraction fixes finite numeric sorting', [10, 9, 1].sort((a, b) => a - b), [1, 9, 10])
  check('string keys use lexical comparison', sortBy(['Zoe', 'Ada', 'Bea'], byKey(value => value)), ['Ada', 'Bea', 'Zoe'])
  check('equal infinities compare equal', byKey((value: number) => value)(Infinity, Infinity), 0)
  check('subtraction of equal infinities is NaN', Number.isNaN(Infinity - Infinity), true)
  const stringKeys = [{ x: 'Zoe' }, { x: 'Ada' }]
  // @ts-expect-error Subtracting strings is a TS error and produces NaN at runtime.
  check('subtracting string properties fails', Number.isNaN(stringKeys[0].x - stringKeys[1].x), true)
  // A comparator needs negative / zero / positive, never a boolean, and consistent ordering.
  check('a boolean comparison cannot distinguish less-than from equality', 1 > 2, 1 > 1)
  check('sort treats a NaN comparison as a tie', [NaN, 1].sort((a, b) => a - b), [NaN, 1])
  checkThrows('our comparator rejects NaN', () => sortBy([NaN, 1], byKey(value => value)), 'NaN')
  checkThrows('our comparator rejects mixed key types', () => byKey((value: string | number) => value)('2', 10), 'same type')
})

suite('mutation and modern copying methods', () => {
  const values = [3, 1, 2]
  check('sort returns the same array', values.sort((a, b) => a - b) === values, true)
  check('sort mutates the input', values, [1, 2, 3])
  check('reverse also returns the same array', values.reverse() === values, true)
  check('reverse mutates the input', values, [3, 2, 1])

  // ES2023 copying methods may be missing on an older Coderpad target; use copies there.
  check('toSorted returns a sorted copy', values.toSorted((a, b) => a - b), [1, 2, 3])
  check('toReversed returns a reversed copy', values.toReversed(), [1, 2, 3])
  check('with replaces one item in a copy', values.with(1, 9), [3, 9, 1])
  check('all copying methods leave the original alone', values, [3, 2, 1])
  check('copy then sort works on older targets', [...values].sort((a, b) => a - b), [1, 2, 3])
  check('copy then reverse works on older targets', [...values].reverse(), [1, 2, 3])
  checkThrows('with rejects an out-of-bounds index', () => values.with(3, 9))
})

suite('partitioning, chunks and pairs', () => {
  check('partition keeps order in both groups', partition([3, 2, 1, 4], value => value % 2 === 0), [[2, 4], [3, 1]])
  check('empty partition', partition<number>([], value => value > 0), [[], []])
  check('chunk keeps a short final group', chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  check('large chunk', chunk([1, 2], 5), [[1, 2]])
  check('empty chunks', chunk([], 2), [])
  for (const size of [0, -1, 1.5, NaN, Infinity]) {
    checkThrows(`reject invalid chunk size ${size}`, () => chunk([1, 2], size), 'positive safe integer')
  }
  check('zip preserves both element types', zip(['a', 'b'], [1, 2]), [['a', 1], ['b', 2]])
  check('zip truncates a longer left input', zip([1, 2, 3], ['a']), [[1, 'a']])
  check('zip truncates a longer right input', zip([1], ['a', 'b']), [[1, 'a']])
  check('empty zip', zip([], [1, 2]), [])
})

suite('aggregation, ranges and rotation', () => {
  const agents = [{ id: 'a', resolved: 4 }, { id: 'b', resolved: 9 }, { id: 'c', resolved: 9 }]
  check('sum a property', sumBy(agents, agent => agent.resolved), 22)
  check('empty sum is zero', sumBy<number>([], value => value), 0)
  check('maxBy keeps the first tie', maxBy(agents, agent => agent.resolved), agents[1])
  check('empty maximum is undefined', maxBy<number>([], value => value), undefined)
  check('maximum of negatives', maxBy([-5, -2, -7], value => value), -2)
  check('negative infinity is a valid score', maxBy([-Infinity], value => value), -Infinity)
  checkThrows('first NaN score is rejected', () => maxBy([NaN], value => value), 'NaN')
  checkThrows('later NaN score is rejected', () => maxBy([1, NaN], value => value), 'NaN')

  check('end-exclusive range', range(0, 4), [0, 1, 2, 3])
  check('range with a positive step', range(1, 8, 3), [1, 4, 7])
  check('descending range', range(5, 0, -2), [5, 3, 1])
  check('equal bounds give an empty range', range(2, 2), [])
  check('step pointing away gives an empty range', range(5, 1), [])
  check('negative step pointing away gives an empty range', range(1, 5, -1), [])
  checkThrows('zero step cannot make progress', () => range(0, 3, 0), 'non-zero')
  checkThrows('fractional step is rejected', () => range(0, 3, 0.5), 'safe integers')
  checkThrows('infinite bounds are rejected', () => range(0, Infinity), 'safe integers')
  checkThrows('NaN bounds are rejected', () => range(NaN, 3), 'safe integers')

  const original = [1, 2, 3, 4]
  check('rotate right', rotate(original, 1), [4, 1, 2, 3])
  check('rotate left with negative steps', rotate(original, -1), [2, 3, 4, 1])
  check('rotation wraps', rotate(original, 6), [3, 4, 1, 2])
  check('zero rotation returns a copy', rotate(original, 0) === original, false)
  check('a full turn keeps the order', rotate(original, 4), original)
  check('empty rotation avoids modulo by zero', rotate([], -1), [])
  check('rotation leaves input unchanged', original, [1, 2, 3, 4])
  checkThrows('fractional rotation is rejected', () => rotate(original, 0.5), 'safe integer')
})

suite('uniqueness and set operations', () => {
  const left = [{ id: 2, name: 'first' }, { id: 1, name: 'one' }, { id: 2, name: 'duplicate' }]
  const right = [{ id: 2, name: 'other' }, { id: 3, name: 'three' }]
  check('uniqueBy keeps the first occurrence', uniqueBy(left, item => item.id), [left[0], left[1]])
  check('uniqueBy on empty input', uniqueBy<number, number>([], value => value), [])
  check('intersection keeps left values and order', intersectionBy(left, right, item => item.id), [left[0]])
  check('difference keeps left-only keys', differenceBy(left, right, item => item.id), [left[1]])
  check('intersection with an empty set', intersectionBy(left, [], item => item.id), [])
  check('difference with an empty set still removes duplicate keys', differenceBy(left, [], item => item.id), [left[0], left[1]])
  check('difference with an empty left input', differenceBy([], right, item => item.id), [])
  // Set and includes use SameValueZero: NaN matches NaN; indexOf uses strict equality.
  check('includes finds NaN', [NaN].includes(NaN), true)
  check('indexOf cannot find NaN', [NaN].indexOf(NaN), -1)
  check('Set-based uniqueness also recognises NaN', uniqueBy([NaN, NaN, 1], value => value), [NaN, 1])
})

suite('sparse arrays and shared references', () => {
  const sparse = new Array<number>(3)
  check('a sparse array has a length but no entries', sparse.length, 3)
  check('holes are not own properties', Object.keys(sparse), [])
  let calls = 0
  sparse.map(() => { calls++; return 0 })
  check('map skips holes entirely', calls, 0)
  check('Array.from creates actual entries', Array.from({ length: 3 }, (_, index) => index), [0, 1, 2])

  const shared = new Array<number[]>(3).fill([])
  shared[0].push(7)
  check('fill repeats one array reference', shared, [[7], [7], [7]])
  check('filled elements are the same object', shared[0] === shared[1], true)
  const independent = Array.from({ length: 3 }, () => [] as number[])
  independent[0].push(7)
  check('a factory gives each slot its own array', independent, [[7], [], []])
})

import { check, suite } from '../lib/check'

// O(n) time and space, assuming an O(1) key function.
// Built on the Map version on purpose. The obvious `if (result[k]) result[k].push(item)` is wrong:
// 'constructor' and 'toString' are truthy through the prototype chain, so it finds a function and
// throws on .push, and assigning result['__proto__'] re-parents the object instead of storing a key.
// Object.fromEntries defines own properties, so both names survive as ordinary keys.
export function groupBy<T>(items: readonly T[], key: (item: T) => string | number): Record<string, T[]> {
  return Object.fromEntries(groupByMap(items, item => String(key(item))))
}

// O(n) time and space. Use this over groupBy when keys aren't strings/numbers, when a key
// might collide with a prototype property name (e.g. 'constructor'), or when insertion
// order across keys matters — Map preserves it, a plain object's integer-like keys do not.
export function groupByMap<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const group = result.get(k)
    if (group) group.push(item)
    else result.set(k, [item])
  }
  return result
}

// O(n) time and space. Last item for a key wins, unlike groupBy which keeps every item.
export function indexBy<T>(items: readonly T[], key: (item: T) => string): Record<string, T> {
  const result: Record<string, T> = {}
  for (const item of items) result[key(item)] = item
  return result
}

// O(n) time and space. Counts through a Map for the same prototype-key reason as groupBy:
// `(result['constructor'] ?? 0) + 1` concatenates onto the inherited Object constructor function.
export function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return Object.fromEntries(counts)
}

// O(n) time and space, assuming an O(1) mapper.
export function mapValues<T, R>(record: Record<string, T>, fn: (value: T, key: string) => R): Record<string, R> {
  const result: Record<string, R> = {}
  for (const [k, v] of Object.entries(record)) result[k] = fn(v, k)
  return result
}

// O(k) time and space for k requested keys.
export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) result[key] = obj[key]
  }
  return result
}

// O(n) time and space, n = keys on obj.
export function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const drop = new Set<PropertyKey>(keys)
  const result = {} as Omit<T, K>
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!drop.has(key)) (result as T)[key] = obj[key]
  }
  return result
}

// O(n) time and space. Assumes values are unique; a later duplicate value overwrites an earlier one.
export function invert<V extends string | number>(record: Record<string, V>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(record)) result[String(v)] = k
  return result
}

// O(n log n) time, O(n) space.
export function entriesSortedBy<V>(record: Record<string, V>, score: (value: V, key: string) => number): [string, V][] {
  return Object.entries(record).sort(([ak, av], [bk, bv]) => score(av, ak) - score(bv, bk))
}

// O(n) time and space, n = total keys across the object tree. Only plain objects and
// arrays are recursed into; Object.freeze itself is shallow, this makes it deep.
export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key])
    Object.freeze(value)
  }
  return value
}

suite('groupBy, groupByMap and indexBy', () => {
  type Ticket = { id: string, status: string }
  const tickets: Ticket[] = [
    { id: 'a', status: 'open' },
    { id: 'b', status: 'closed' },
    { id: 'c', status: 'open' }
  ]
  check('groupBy collects every match under its key', groupBy(tickets, t => t.status), {
    open: [tickets[0], tickets[2]],
    closed: [tickets[1]]
  })
  check('empty input groups to an empty record', groupBy<Ticket>([], t => t.status), {})

  const byIdObject = { id: 'x' }
  const groupedByObjectKey = groupByMap(tickets, () => byIdObject)
  check('groupByMap supports a non-string key', groupedByObjectKey.get(byIdObject), tickets)
  check('a different-but-equal-looking object is not the same key', groupedByObjectKey.get({ id: 'x' }), undefined)

  check('indexBy keeps the last item for a repeated key', indexBy([{ k: 'a', v: 1 }, { k: 'a', v: 2 }], t => t.k), {
    a: { k: 'a', v: 2 }
  })
})

suite('countBy, mapValues, pick, omit, invert, entriesSortedBy', () => {
  check('countBy tallies occurrences', countBy(['a', 'b', 'a', 'a'], v => v), { a: 3, b: 1 })
  check('mapValues transforms every value, keeps keys', mapValues({ a: 1, b: 2 }, v => v * 10), { a: 10, b: 20 })

  const user = { id: 1, name: 'Ada', password: 'secret' }
  check('pick keeps only requested keys', pick(user, ['id', 'name']), { id: 1, name: 'Ada' })
  check('pick ignores a missing key rather than adding undefined', Object.keys(pick(user, ['id', 'password'])), ['id', 'password'])
  check('omit drops the requested keys', omit(user, ['password']), { id: 1, name: 'Ada' })

  check('invert swaps keys and values', invert({ a: 1, b: 2 }), { 1: 'a', 2: 'b' })
  check('entriesSortedBy orders by score', entriesSortedBy({ a: 3, b: 1, c: 2 }, v => v), [['b', 1], ['c', 2], ['a', 3]])
})

suite('deepFreeze', () => {
  const nested = deepFreeze({ a: 1, b: { c: 2 } })
  check('the top level is frozen', Object.isFrozen(nested), true)
  check('nested objects are frozen too', Object.isFrozen(nested.b), true)
  try {
    // Readonly<T> is shallow at the type level, so this compiles; the runtime freeze is
    // what actually stops it, throwing because ES modules are strict mode.
    nested.b.c = 99
  } catch {
    // expected
  }
  check('a frozen nested value cannot be mutated', nested.b.c, 2)
})

suite('gotcha: integer-like keys reorder in a plain object', () => {
  const obj: Record<string, number> = { '2': 1, '1': 1, b: 1 }
  // Integer-like keys are sorted ascending and listed before insertion-ordered string keys.
  check('Object.keys sorts integer-like keys first, ascending', Object.keys(obj), ['1', '2', 'b'])
  const map = new Map<string, number>([['2', 1], ['1', 1], ['b', 1]])
  check('a Map keeps true insertion order regardless of key shape', [...map.keys()], ['2', '1', 'b'])
})

suite('gotcha: Object.entries / fromEntries round trip', () => {
  const source = { a: 1, b: 2 }
  const roundTripped = Object.fromEntries(Object.entries(source))
  check('entries then fromEntries reconstructs the object', roundTripped, source)
  // fromEntries' inferred type is widened to { [k: string]: number }, losing the literal keys.
  const widened: { [k: string]: number } = Object.fromEntries(Object.entries(source))
  check('the widened type still holds the right values', widened.a, 1)
})

suite('gotcha: Map vs Record vs Set', () => {
  // Map wins for non-string keys, for keys that might collide with a prototype
  // property name, and when insertion order across the whole collection matters.
  const dangerous: Record<string, number> = {}
  dangerous['constructor'] = 1
  check('a plain object can be assigned a prototype-shadowing key', dangerous.constructor, 1)
  const safe = new Map<string, number>()
  safe.set('constructor', 1)
  check('a Map never confuses a key with a prototype property', safe.get('constructor'), 1)

  const objKey = { id: 1 }
  const byRef = new Map<object, string>([[objKey, 'first']])
  check('Map object keys compare by reference, not by shape', byRef.get({ id: 1 }), undefined)
  check('the original reference still matches', byRef.get(objKey), 'first')

  const unique = new Set([1, 2, 2, 3])
  check('Set dedupes and preserves insertion order', [...unique], [1, 2, 3])
})

suite('gotcha: modern grouping helpers and target caveats', () => {
  // Object.groupBy / Map.groupBy exist in modern runtimes (Node 21+, recent bundler targets),
  // but need an ES2024 lib target that this project's ES2023 tsconfig deliberately avoids,
  // to mirror Coderpad's likely older target — so hand-rolling groupBy above is safer.
  // @ts-expect-error needs the ES2024 lib; the callback param is then implicitly 'any' too.
  const grouped = Object.groupBy(['a', 'bb', 'ccc'], (v: string) => (v.length % 2 === 0 ? 'even' : 'odd'))
  check('Object.groupBy groups by the callback result', grouped, { odd: ['a', 'ccc'], even: ['bb'] })
  // @ts-expect-error needs the ES2024 lib; the callback param is then implicitly 'any' too.
  const mapGrouped = Map.groupBy(['a', 'bb', 'ccc'], (v: string) => v.length)
  check('Map.groupBy returns a Map keyed by the callback result', mapGrouped.get(2), ['bb'])
})

suite('gotcha: in, hasOwnProperty, optional chaining, Object.create(null)', () => {
  const parent = { inherited: true }
  const child = Object.create(parent)
  child.own = true
  check('"in" sees inherited properties', 'inherited' in child, true)
  check('hasOwnProperty does not', Object.prototype.hasOwnProperty.call(child, 'inherited'), false)
  check('hasOwnProperty finds an own property', Object.prototype.hasOwnProperty.call(child, 'own'), true)

  const maybe: { a?: { b?: number } } = {}
  check('optional chaining short-circuits to undefined on a missing path', maybe.a?.b, undefined)

  const dict: Record<string, number> = Object.create(null)
  dict.count = 1
  check('a null-prototype dictionary has no inherited properties', 'toString' in dict, false)
  check('it still stores its own keys normally', dict.count, 1)
})

suite('gotcha: delete vs undefined, and JSON.stringify', () => {
  const obj: Record<string, number | undefined> = { a: 1, b: 2 }
  obj.b = undefined
  check('setting undefined keeps the key present', Object.keys(obj), ['a', 'b'])
  delete obj.a
  check('delete actually removes the key', Object.keys(obj), ['b'])
  check('JSON.stringify drops keys whose value is undefined', JSON.stringify({ a: 1, b: undefined }), '{"a":1}')
  check('JSON.stringify keeps null, unlike undefined', JSON.stringify({ a: null }), '{"a":null}')
})

suite('keys that collide with prototype property names', () => {
  // The naive `if (result[k])` finds Object.prototype.constructor, a truthy function, and throws
  // on .push. Counting with `result[k] ?? 0` concatenates onto that function instead of adding.
  check('groupBy survives constructor', groupBy([1, 2], () => 'constructor'), { constructor: [1, 2] })
  check('countBy survives constructor', countBy(['x', 'y'], () => 'constructor'), { constructor: 2 })
  check('groupBy survives toString', groupBy([1], () => 'toString'), { toString: [1] })
  // Assigning result['__proto__'] on a plain object re-parents it instead of storing a key;
  // Object.fromEntries defines a real own property, so the group survives.
  check('__proto__ is stored as an own key', Object.hasOwn(groupBy([1], () => '__proto__'), '__proto__'), true)
})

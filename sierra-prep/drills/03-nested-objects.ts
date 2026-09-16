import { check, checkThrows, suite } from '../lib/check'

export type Data = null | undefined | boolean | number | string | Data[] | DataObject
export type DataObject = { [key: string]: Data }
export type MergeOptions = { arrays: 'replace' | 'concat' | 'byId' }
// A record the byId strategy can actually key on.
type IdRecord = DataObject & { id: string | number }

// Path/merge/flatten/prune helpers handle acyclic plain records, arrays and Data primitives.
// Paths use dots and non-negative bracket indices, with no escaping for literal dots/brackets.
function assertSafeKey(key: string): void {
  // These keys can reach Object.prototype through a path or an unsafe merge assignment.
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error(`Unsafe key: ${key}`)
  }
}

function pathParts(path: string): string[] {
  const normalised = path.replace(/\[(0|[1-9]\d*)\]/g, '.$1')
  const parts = (path.startsWith('[') ? normalised.slice(1) : normalised).split('.')
  for (const part of parts) {
    if (!part || /[\[\]]/.test(part)) throw new Error('Invalid path')
    assertSafeKey(part)
  }
  return parts
}

function isIndex(key: string): boolean {
  return /^(0|[1-9]\d*)$/.test(key) && Number(key) < 2 ** 32 - 1
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isDataObject(value: Data): value is DataObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertSafeData(value: Data): void {
  if (value === null || typeof value !== 'object') return
  if (!Array.isArray(value) && !isPlainRecord(value)) throw new Error('Expected plain data')
  for (const [key, child] of Object.entries(value)) {
    assertSafeKey(key)
    assertSafeData(child)
  }
}

// O(l) time and space for a path of l characters. Dynamic paths return unknown.
export function getPath(obj: unknown, path: string, fallback: unknown = undefined): unknown {
  let current = obj
  for (const key of pathParts(path)) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) {
      return fallback
    }
    current = (current as Record<string, unknown>)[key]
  }
  // Keep null, false, 0 and ''. Only missing or undefined uses the fallback.
  return current === undefined ? fallback : current
}

// O(l + w) time and space: path length l, total copied container widths w.
export function setPath(obj: Data, path: string, value: Data): Data {
  const parts = pathParts(path)

  function update(current: Data, depth: number): Data {
    if (depth === parts.length) return value
    const key = parts[depth]
    if (Array.isArray(current) || (current == null && isIndex(key))) {
      if (!isIndex(key)) throw new Error('Expected array index')
      const array = Array.isArray(current) ? current : []
      const index = Number(key)
      // Append is allowed, but gaps would introduce sparse arrays.
      if (index > array.length) throw new Error('Array index would leave a gap')
      const copy = [...array]
      copy[index] = update(array[index], depth + 1)
      return copy
    }
    if (current != null && !isDataObject(current)) throw new Error('Path crosses a primitive')
    const record = current ?? {}
    const child = Object.hasOwn(record, key) ? record[key] : undefined
    return { ...record, [key]: update(child, depth + 1) }
  }

  return update(obj, 0)
}

// O(n) time and space over both acyclic inputs, assuming constant-time Map operations.
export function deepMerge(base: Data, override: Data, options: MergeOptions): Data {
  // Validate whole inputs first, including branches that will be replaced.
  assertSafeData(base)
  assertSafeData(override)

  function merge(left: Data, right: Data): Data {
    if (Array.isArray(left) && Array.isArray(right)) {
      if (options.arrays === 'replace') return deepClone(right)
      if (options.arrays === 'concat') return deepClone([...left, ...right])

      // byId only means anything for arrays of id-bearing records. A nested array of primitives
      // (a tags list, say) is not one, so it falls back to replace rather than throwing. Appending
      // the odd entries instead is equally defensible; problems/03-layered-config picks that. Ask
      // which one the caller wants, because the two give different answers on the same input.
      // The predicate returns `item is IdRecord`, so filtering gives arrays TypeScript knows carry
      // a usable id. Comparing lengths is how we detect that something did not qualify.
      const hasId = (item: Data): item is IdRecord =>
        isDataObject(item) && Object.hasOwn(item, 'id') &&
        (typeof item.id === 'string' || typeof item.id === 'number')
      const leftRecords = left.filter(hasId)
      const rightRecords = right.filter(hasId)
      if (leftRecords.length !== left.length || rightRecords.length !== right.length) {
        return deepClone(right)
      }

      const result: Data[] = []
      const positions = new Map<string | number, number>()
      // IDs must be unique within each input. Preserve base order, append new IDs.
      for (const items of [leftRecords, rightRecords]) {
        const seen = new Set<string | number>()
        for (const item of items) {
          if (seen.has(item.id)) throw new Error('Duplicate ID')
          seen.add(item.id)
          const position = positions.get(item.id)
          if (position === undefined) {
            positions.set(item.id, result.length)
            result.push(deepClone(item))
          } else {
            result[position] = merge(result[position], item)
          }
        }
      }
      return result
    }
    if (isDataObject(left) && isDataObject(right)) {
      const result: DataObject = {}
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
        if (!Object.hasOwn(right, key)) result[key] = deepClone(left[key])
        else if (!Object.hasOwn(left, key)) result[key] = deepClone(right[key])
        else result[key] = merge(left[key], right[key])
      }
      return result
    }
    // Explicit undefined is an override too. Neither input is mutated or aliased.
    return deepClone(right)
  }

  return merge(base, override)
}

// O(n + p) time and space: n visited values, p total characters in emitted paths.
export function flatten(obj: DataObject): Record<string, Data> {
  const result: Record<string, Data> = {}

  function visit(value: Data, path: string): void {
    if (value === null || typeof value !== 'object' || Object.keys(value).length === 0) {
      result[path] = deepClone(value)
      return
    }
    for (const [key, child] of Object.entries(value)) {
      assertSafeKey(key)
      // Numeric object keys and literal separators are ambiguous when rebuilding arrays.
      if (!key || /[.\[\]]/.test(key) || (!Array.isArray(value) && isIndex(key))) {
        throw new Error('Key cannot be flattened unambiguously')
      }
      visit(child, path ? `${path}.${key}` : key)
    }
  }

  if (Object.keys(obj).length > 0) visit(obj, '')
  return result
}

// O(p*n + l) time, O(n + l) space: p paths, n rebuilt values, l path characters.
export function unflatten(flat: Record<string, Data>): DataObject {
  let result: Data = {}
  // Compare segment by segment, numerically where both sides are indices, so 'a.0.0' lands before
  // 'a.1' and arrays fill without gaps. Sorting by depth first looks right and is not: it applies
  // 'a.1' before 'a.0.0' and setPath then refuses the gap.
  const paths = Object.keys(flat).sort((a, b) => {
    const left = pathParts(a)
    const right = pathParts(b)
    const shared = Math.min(left.length, right.length)
    for (let i = 0; i < shared; i++) {
      if (left[i] === right[i]) continue
      if (isIndex(left[i]) && isIndex(right[i])) return Number(left[i]) - Number(right[i])
      return left[i] < right[i] ? -1 : 1
    }
    // A path that is a prefix of another comes first, which is what the overlap check expects.
    return left.length - right.length
  })
  const assigned = new Set<string>()
  for (const path of paths) {
    const parts = pathParts(path)
    if (isIndex(parts[0])) throw new Error('Expected object at root')
    const canonical = parts.join('.')
    for (let length = 1; length <= parts.length; length++) {
      if (assigned.has(parts.slice(0, length).join('.'))) throw new Error('Overlapping paths')
    }
    assigned.add(canonical)
    result = setPath(result, path, deepClone(flat[path]))
  }
  return result as DataObject
}

// O(n) time, O(n) auxiliary space. Plain records/arrays/primitives; cycle-safe equality is out of scope.
export function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false
  } else if (!isPlainRecord(left) || !isPlainRecord(right)) {
    return false
  }
  // Compare own enumerable string keys. Descriptors, symbols and class instances are out of scope.
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const keys = Object.keys(leftRecord)
  return keys.length === Object.keys(rightRecord).length && keys.every(key =>
    Object.hasOwn(rightRecord, key) && deepEqual(leftRecord[key], rightRecord[key]))
}

// O(n) time and space. Supports structured-cloneable values and cycles; functions throw.
export function deepClone<T>(value: T): T {
  return structuredClone(value)
}

// O(n) time and space. Arrays compact after removal; a nullish root becomes undefined.
export function prune(value: Data): Data {
  if (value == null) return undefined
  if (Array.isArray(value)) {
    return value.map(child => prune(child)).filter(child => child !== undefined)
  }
  if (isDataObject(value)) {
    const entries = Object.entries(value).map(([key, child]) => [key, prune(child)] as const)
    return Object.fromEntries(entries.filter(([, child]) => child !== undefined))
  }
  return value
}

// O(k) time and space for k own keys. Renames one level; collisions throw.
export function renameKeys<T>(obj: Record<string, T>, names: Record<string, string>): Record<string, T> {
  const entries: [string, T][] = []
  const used = new Set<string>()
  for (const [key, value] of Object.entries(obj)) {
    const renamed = Object.hasOwn(names, key) ? names[key] : key
    if (used.has(renamed)) throw new Error(`Rename collision: ${renamed}`)
    used.add(renamed)
    // fromEntries creates own properties safely, even for a key named __proto__.
    entries.push([renamed, value])
  }
  return Object.fromEntries(entries)
}

export type ApiResponse = {
  accounts: {
    id: string
    name: string
    conversations: {
      id: string
      messages?: { id: string, text: string }[]
    }[]
  }[]
}

export type MessageRow = {
  accountId: string
  accountName: string
  conversationId: string
  messageId: string
  text: string
}

// O(a + c + m) time and O(m) space over accounts, conversations and messages.
export function toRows(response: ApiResponse): MessageRow[] {
  const rows: MessageRow[] = []
  for (const account of response.accounts) {
    for (const conversation of account.conversations) {
      for (const message of conversation.messages ?? []) {
        rows.push({
          accountId: account.id,
          accountName: account.name,
          conversationId: conversation.id,
          messageId: message.id,
          text: message.text
        })
      }
    }
  }
  return rows
}

suite('paths and immutable updates', () => {
  const obj = { a: { b: [{ c: 0 }] }, untouched: { active: true } }
  check('mixed dot/bracket path', getPath(obj, 'a.b[0].c', 99), 0)
  check('missing property', getPath(obj, 'a.b[1].c', 'missing'), 'missing')
  check('null survives', getPath({ a: null }, 'a', 'fallback'), null)
  check('undefined uses fallback', getPath({ a: undefined }, 'a', 'fallback'), 'fallback')
  check('inherited property is missing', getPath({}, 'toString', 'missing'), 'missing')
  const updated = setPath(obj, 'a.b[0].c', 3)
  check('new leaf', getPath(updated, 'a.b[0].c'), 3)
  check('original leaf unchanged', obj.a.b[0].c, 0)
  check('root copied', updated === obj, false)
  check('changed branch copied', getPath(updated, 'a') === obj.a, false)
  check('unchanged branch shared', getPath(updated, 'untouched') === obj.untouched, true)
  check('creates missing containers', setPath({}, 'a.b[0].c', 1), { a: { b: [{ c: 1 }] } })
  check('root array', setPath([], '[0].id', 'a'), [{ id: 'a' }])
  checkThrows('no sparse gaps', () => setPath([], '[2]', 1), 'gap')
  checkThrows('cannot traverse a primitive', () => setPath({ a: 1 }, 'a.b', 2), 'primitive')
  checkThrows('invalid path', () => getPath({}, 'a..b'), 'Invalid')
})

suite('merge policies and unsafe keys', () => {
  const base = { settings: { timeout: 10, enabled: true }, tags: ['a'] }
  const override = { settings: { timeout: 20 }, tags: ['b'] }
  check('replace arrays', deepMerge(base, override, { arrays: 'replace' }), {
    settings: { timeout: 20, enabled: true }, tags: ['b']
  })
  check('concat arrays', getPath(deepMerge(base, override, { arrays: 'concat' }), 'tags'), ['a', 'b'])
  const merged = deepMerge(base, {}, { arrays: 'replace' })
  check('merge does not share base branches', getPath(merged, 'settings') === base.settings, false)
  check('input untouched', base.settings.timeout, 10)
  check('explicit undefined overrides', deepMerge({ a: 1 }, { a: undefined }, { arrays: 'replace' }), { a: undefined })
  check('different types replace', deepMerge({ a: 1 }, [2], { arrays: 'replace' }), [2])
  check('merge records by ID', deepMerge(
    [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Bo' }],
    [{ id: 'a', active: true }, { id: 'c', name: 'Cy' }],
    { arrays: 'byId' }
  ), [{ id: 'a', name: 'Ada', active: true }, { id: 'b', name: 'Bo' }, { id: 'c', name: 'Cy' }])
  check('byId falls back to replace when entries have no id', deepMerge([1], [2, 3], { arrays: 'byId' }), [2, 3])
  check('a primitive array nested inside a matched record is replaced, not merged', deepMerge(
    [{ id: 1, tags: ['a', 'b'] }],
    [{ id: 1, tags: ['c'] }],
    { arrays: 'byId' }
  ), [{ id: 1, tags: ['c'] }])
  checkThrows('duplicate IDs', () => deepMerge([], [{ id: 1 }, { id: 1 }], { arrays: 'byId' }), 'Duplicate')
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    checkThrows(`reject path key ${key}`, () => setPath({}, `safe.${key}.polluted`, true), 'Unsafe')
    const payload = { nested: { [key]: { polluted: true } } }
    checkThrows(`reject merge key ${key}`, () => deepMerge({}, payload, { arrays: 'replace' }), 'Unsafe')
    checkThrows(`reject unsafe base key ${key}`, () => deepMerge(payload, {}, { arrays: 'replace' }), 'Unsafe')
  }
  const parsed: Data = JSON.parse('{"__proto__":{"polluted":true}}')
  checkThrows('JSON payload is rejected', () => deepMerge({}, parsed, { arrays: 'replace' }), 'Unsafe')
  check('Object.prototype untouched', Object.hasOwn(Object.prototype, 'polluted'), false)
})

suite('flattening, pruning, renaming and API rows', () => {
  const nested = { user: { name: 'Ada' }, tags: ['one', 'two'], empty: {}, none: [], value: null }
  const flat = flatten(nested)
  check('dotted leaves and empty containers', flat, {
    'user.name': 'Ada', 'tags.0': 'one', 'tags.1': 'two', empty: {}, none: [], value: null
  })
  check('round trip', unflatten(flat), nested)
  check('array paths supplied out of order', unflatten({ 'a.1': 'b', 'a.0': 'a' }), { a: ['a', 'b'] })
  check('empty root', unflatten(flatten({})), {})
  checkThrows('ambiguous literal dot', () => flatten({ 'a.b': 1 }), 'unambiguously')
  checkThrows('ambiguous numeric object key', () => flatten({ a: { '0': 1 } }), 'unambiguously')
  checkThrows('overlapping paths', () => unflatten({ a: null, 'a.b': 1 }), 'Overlapping')
  checkThrows('equivalent path spellings', () => unflatten({ 'a.0': 1, 'a[0]': 2 }), 'Overlapping')
  check('prune recursively but preserve falsy values', prune({
    nil: null, absent: undefined, zero: 0, no: false, text: '', items: [null, 1, undefined, { a: null }]
  }), { zero: 0, no: false, text: '', items: [1, {}] })
  check('null root is removed', prune(null), undefined)
  check('rename selected keys', renameKeys({ first_name: 'Ada', role: 'agent' }, { first_name: 'firstName' }), {
    firstName: 'Ada', role: 'agent'
  })
  checkThrows('rename collision', () => renameKeys({ a: 1, b: 2 }, { a: 'b' }), 'collision')
  const response: ApiResponse = { accounts: [{
    id: 'a1', name: 'Acme', conversations: [
      { id: 'c1', messages: [{ id: 'm1', text: 'Hello' }, { id: 'm2', text: 'Help' }] },
      { id: 'c2' }
    ]
  }] }
  check('one row per message', toRows(response), [
    { accountId: 'a1', accountName: 'Acme', conversationId: 'c1', messageId: 'm1', text: 'Hello' },
    { accountId: 'a1', accountName: 'Acme', conversationId: 'c1', messageId: 'm2', text: 'Help' }
  ])
  check('no accounts', toRows({ accounts: [] }), [])
})

suite('shallow copies and equality', () => {
  const original = { profile: { name: 'Ada' } }
  const spread = { ...original }
  const assigned = Object.assign({}, original)
  spread.profile.name = 'Bo'
  check('spread aliases nested objects', original.profile.name, 'Bo')
  assigned.profile.name = 'Cy'
  check('Object.assign aliases too', original.profile.name, 'Cy')
  const cloned = deepClone(original)
  cloned.profile.name = 'Dee'
  check('deep clone is independent', original.profile.name, 'Cy')
  check('key order does not matter', deepEqual({ a: 1, b: [2] }, { b: [2], a: 1 }), true)
  check('different nested leaf', deepEqual({ a: [1] }, { a: [2] }), false)
  check('missing differs from undefined', deepEqual({}, { a: undefined }), false)
  check('array differs from object', deepEqual([], {}), false)
  check('array length matters', deepEqual(new Array(1), []), false)
  check('hole differs from explicit undefined', deepEqual(new Array(1), [undefined]), false)
  check('NaN uses Object.is', deepEqual(NaN, NaN), true)
  check('signed zeros differ with Object.is', deepEqual(0, -0), false)
})

suite('structuredClone versus JSON cloning', () => {
  const source = {
    date: new Date('2025-01-01T00:00:00.000Z'),
    map: new Map([['a', 1]]), set: new Set([2]), absent: undefined,
    nan: NaN, positive: Infinity, negative: -Infinity
  }
  const cloned = deepClone(source)
  check('structured clone keeps Dates', cloned.date instanceof Date, true)
  check('structured clone keeps timestamp', cloned.date.getTime(), source.date.getTime())
  check('structured clone keeps Maps', cloned.map, new Map([['a', 1]]))
  check('structured clone keeps Sets', cloned.set, new Set([2]))
  check('structured clone keeps undefined key', Object.hasOwn(cloned, 'absent'), true)
  check('structured clone keeps NaN', Number.isNaN(cloned.nan), true)
  check('structured clone keeps infinities', [cloned.positive, cloned.negative], [Infinity, -Infinity])
  // JSON is a serialisation format: toJSON turns Dates into strings; Map/Set have no enumerable entries.
  const json: unknown = JSON.parse(JSON.stringify(source))
  check('JSON loses those types and values', json, {
    date: '2025-01-01T00:00:00.000Z', map: {}, set: {}, nan: null, positive: null, negative: null
  })
  check('JSON drops undefined object properties', Object.hasOwn(json as object, 'absent'), false)
  check('JSON changes undefined array slots to null', JSON.stringify([undefined]), '[null]')
  check('top-level undefined gives no JSON text', JSON.stringify(undefined), undefined)
  const cyclic: { name: string, self?: unknown } = { name: 'loop' }
  cyclic.self = cyclic
  const cyclicClone = deepClone(cyclic)
  check('structured clone preserves a cycle', cyclicClone.self === cyclicClone, true)
  check('cycle clone is a new object', cyclicClone === cyclic, false)
  checkThrows('JSON rejects cycles', () => JSON.stringify(cyclic))
  const fn = () => 1
  checkThrows('structured clone rejects functions', () => deepClone({ fn }))
  check('JSON silently drops object functions', JSON.stringify({ fn }), '{}')
  check('JSON changes array functions to null', JSON.stringify([fn]), '[null]')
  check('top-level function gives no JSON text', JSON.stringify(fn), undefined)
})

suite('flatten/unflatten round trip on awkward shapes', () => {
  // A deeper container before a shallower sibling: flatten gives 'a.0.0' and 'a.1', so unflatten
  // must order by index, not by path depth, or it tries to write a[1] before a[0] exists.
  check('nested array first', unflatten(flatten({ a: [[1], 2] })), { a: [[1], 2] })
  check('record first', unflatten(flatten({ a: [{ b: 1 }, 2] })), { a: [{ b: 1 }, 2] })
  check('deep mixed', unflatten(flatten({ a: [[1, 2], { b: [3] }, 4] })), { a: [[1, 2], { b: [3] }, 4] })
})

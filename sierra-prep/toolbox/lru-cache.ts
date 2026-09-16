import { check, suite } from '../lib/check'

// Time O(1) per operation, space O(capacity). A Map keeps insertion order, so deleting
// and re-setting a key on every touch promotes it to "most recent" for free — the
// doubly-linked-list version below only earns its complexity in a language without this.
export class LRUCache<K, V> {
  private map = new Map<K, V>()

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new RangeError('capacity must be a positive integer')
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    const value = this.map.get(key) as V
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as K
      this.map.delete(oldest)
    }
  }

  size(): number {
    return this.map.size
  }
}

type Node<K, V> = {
  key: K
  value: V
  prev: Node<K, V> | null
  next: Node<K, V> | null
}

// Time O(1) per operation, space O(capacity). Explicit doubly linked list plus a map for
// O(1) lookup, the shape an interviewer wants if they ask for the language-agnostic version.
export class LRUCacheLinked<K, V> {
  private map = new Map<K, Node<K, V>>()
  private head: Node<K, V> | null = null // most recently used
  private tail: Node<K, V> | null = null // least recently used

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new RangeError('capacity must be a positive integer')
  }

  get(key: K): V | undefined {
    const node = this.map.get(key)
    if (!node) return undefined
    this.moveToFront(node)
    return node.value
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key)
    if (existing) {
      existing.value = value
      this.moveToFront(existing)
      return
    }

    const node: Node<K, V> = { key, value, prev: null, next: this.head }
    if (this.head) this.head.prev = node
    this.head = node
    if (!this.tail) this.tail = node
    this.map.set(key, node)

    if (this.map.size > this.capacity) {
      const evict = this.tail!
      this.unlink(evict)
      this.map.delete(evict.key)
    }
  }

  size(): number {
    return this.map.size
  }

  private moveToFront(node: Node<K, V>): void {
    if (node === this.head) return
    this.unlink(node)
    node.prev = null
    node.next = this.head
    if (this.head) this.head.prev = node
    this.head = node
    if (!this.tail) this.tail = node
  }

  private unlink(node: Node<K, V>): void {
    if (node.prev) node.prev.next = node.next
    else this.head = node.next
    if (node.next) node.next.prev = node.prev
    else this.tail = node.prev
  }
}

// Time O(1) amortised per operation (sweep is O(n)), space O(capacity)... unbounded here
// since eviction is by expiry, not size — a real cache would cap size too.
export class TTLCache<K, V> {
  private map = new Map<K, { value: V, expiresAt: number }>()

  constructor(private readonly ttlMs: number, private readonly now: () => number = Date.now) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (this.now() >= entry.expiresAt) {
      this.map.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: K, value: V): void {
    this.map.set(key, { value, expiresAt: this.now() + this.ttlMs })
  }

  // Time O(n). Call periodically to reclaim memory from keys nobody has read since expiry.
  sweep(): void {
    const now = this.now()
    for (const [key, entry] of this.map) {
      if (now >= entry.expiresAt) this.map.delete(key)
    }
  }

  size(): number {
    return this.map.size
  }
}

suite('LRUCache', () => {
  const cache = new LRUCache<string, number>(2)
  cache.set('a', 1)
  cache.set('b', 2)
  cache.set('c', 3)
  check('eviction drops the least recently used key', cache.get('a'), undefined)
  check('recently set keys survive', [cache.get('b'), cache.get('c')], [2, 3])

  const promote = new LRUCache<string, number>(2)
  promote.set('a', 1)
  promote.set('b', 2)
  promote.get('a')
  promote.set('c', 3)
  check('get promotes a key, sparing it from eviction', promote.get('a'), 1)
  check('the unpromoted key is evicted instead', promote.get('b'), undefined)

  const update = new LRUCache<string, number>(2)
  update.set('a', 1)
  update.set('a', 9)
  check('setting an existing key updates its value', update.get('a'), 9)
  check('size reflects distinct keys', update.size(), 1)
})

suite('LRUCacheLinked', () => {
  const cache = new LRUCacheLinked<string, number>(2)
  cache.set('a', 1)
  cache.set('b', 2)
  cache.set('c', 3)
  check('eviction drops the least recently used key', cache.get('a'), undefined)
  check('recently set keys survive', [cache.get('b'), cache.get('c')], [2, 3])

  const promote = new LRUCacheLinked<string, number>(2)
  promote.set('a', 1)
  promote.set('b', 2)
  promote.get('a')
  promote.set('c', 3)
  check('get promotes a key, sparing it from eviction', promote.get('a'), 1)
  check('the unpromoted key is evicted instead', promote.get('b'), undefined)

  const update = new LRUCacheLinked<string, number>(2)
  update.set('a', 1)
  update.set('a', 9)
  check('setting an existing key updates its value', update.get('a'), 9)
  check('size reflects distinct keys', update.size(), 1)
})

suite('TTLCache', () => {
  let now = 0
  const cache = new TTLCache<string, number>(100, () => now)
  cache.set('a', 1)
  check('read before expiry succeeds', cache.get('a'), 1)
  now = 150
  check('read after expiry is evicted lazily', cache.get('a'), undefined)
  check('lazy eviction removed the entry', cache.size(), 0)

  now = 0
  cache.set('a', 1)
  cache.set('b', 2)
  now = 150
  cache.set('c', 3)
  cache.sweep()
  check('sweep removes every expired entry', cache.size(), 1)
  check('the freshly set entry survives sweep', cache.get('c'), 3)
})

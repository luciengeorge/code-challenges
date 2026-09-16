import { check, suite } from '../../lib/check'

type Article = { id: string, title: string, views: number }

// Decisions made up front:
// - The prefix matches the start of the whole title. Matching any word comes in follow-up 2,
//   because it changes the index rather than the query.
// - Queries and titles are trimmed and lowercased before comparison. Punctuation is kept as typed;
//   stripping it would make "can't" and "cant" both work but needs the same rule at build time.
// - An empty prefix returns the global top k, not nothing. A console that shows the most-read
//   articles before you type is more useful than an empty box.
// - Ties on views break on the raw title, ascending.

function normalise(text: string): string {
  return text.trim().toLowerCase()
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

// Worst first, so a min-heap of size k keeps the k best and drops the rest.
function worseFirst(a: Article, b: Article): number {
  if (a.views !== b.views) return a.views - b.views
  return compareStrings(b.title, a.title)
}

class Heap<T> {
  private items: T[] = []

  constructor(private readonly cmp: (a: T, b: T) => number) {}

  size(): number {
    return this.items.length
  }

  peek(): T | undefined {
    return this.items[0]
  }

  push(item: T): void {
    this.items.push(item)
    let child = this.items.length - 1
    while (child > 0) {
      const parent = (child - 1) >> 1
      if (this.cmp(this.items[parent], this.items[child]) <= 0) break
      this.swap(parent, child)
      child = parent
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined

    const root = this.items[0]
    const last = this.items.pop() as T
    if (this.items.length === 0) return root

    this.items[0] = last
    let parent = 0
    while (true) {
      const left = 2 * parent + 1
      const right = left + 1
      let smallest = parent
      if (left < this.items.length && this.cmp(this.items[left], this.items[smallest]) < 0) smallest = left
      if (right < this.items.length && this.cmp(this.items[right], this.items[smallest]) < 0) smallest = right
      if (smallest === parent) break
      this.swap(parent, smallest)
      parent = smallest
    }
    return root
  }

  private swap(a: number, b: number): void {
    const tmp = this.items[a]
    this.items[a] = this.items[b]
    this.items[b] = tmp
  }
}

// Time: O(m log k) for m candidates; space: O(k). Returns best first.
function topK<T>(items: T[], k: number, worse: (a: T, b: T) => number): T[] {
  const heap = new Heap(worse)
  for (const item of items) {
    if (heap.size() < k) heap.push(item)
    else if (worse(item, heap.peek() as T) > 0) {
      heap.pop()
      heap.push(item)
    }
  }

  const result: T[] = []
  while (heap.size() > 0) result.push(heap.pop() as T)
  return result.reverse()
}

type TrieNode = {
  children: Map<string, TrieNode>
  articles: Article[]
}

function newNode(): TrieNode {
  return { children: new Map(), articles: [] }
}

function insert(root: TrieNode, key: string, article: Article): void {
  let current = root
  for (const char of key) {
    let next = current.children.get(char)
    if (!next) {
      next = newNode()
      current.children.set(char, next)
    }
    current = next
  }
  current.articles.push(article)
}

function descend(root: TrieNode, prefix: string): TrieNode | null {
  let current = root
  for (const char of prefix) {
    const next = current.children.get(char)
    if (!next) return null
    current = next
  }
  return current
}

function collect(node: TrieNode, out: Article[]): void {
  for (const article of node.articles) out.push(article)
  for (const child of node.children.values()) collect(child, out)
}

// Build: O(total title length); space: O(total title length) nodes.
export class Autocomplete {
  private readonly root = newNode()

  constructor(articles: Article[]) {
    for (const article of articles) insert(this.root, normalise(article.title), article)
  }

  // Time: O(p + m + m log k) for prefix length p and m matches; space: O(m + k).
  suggest(prefix: string, k: number): Article[] {
    if (k <= 0) return []

    // An empty prefix descends nowhere and collects the whole trie, which is the decision above.
    const node = descend(this.root, normalise(prefix))
    if (node === null) return []

    const matches: Article[] = []
    collect(node, matches)
    return topK(matches, k, worseFirst)
  }
}

// ---- Follow-up 1: live view counts ----

// Caching top-k at each node is what breaks, so do not. Cache the structure, which only changes
// when articles do: the trie nodes and the article lists hanging off them. Views live on the shared
// Article object, so a page view is a single field write and invalidates nothing above.
// Recompute the ranking per query, which is the O(m log k) heap pass we already pay.
// If m is huge for one-letter prefixes, cache top-k at nodes near the root only, with a short TTL
// and a "recompute if the node's total views moved more than x%" rule. Stale by seconds is fine for
// a help centre; stale by a day is not.

// ---- Follow-up 2: multi-word ----

// One path per word start instead of one per title. Memory grows with the number of words, roughly
// the same total characters plus a node per word boundary, and an article id appears once per word
// it contains, so the id lists get longer. Dedupe at query time.
// Build: O(total title length); query adds an O(m) dedupe pass.
export class WordAutocomplete {
  private readonly root = newNode()

  constructor(articles: Article[]) {
    for (const article of articles) {
      for (const word of normalise(article.title).split(/\s+/)) {
        if (word.length > 0) insert(this.root, word, article)
      }
    }
  }

  suggest(prefix: string, k: number): Article[] {
    if (k <= 0) return []

    const node = descend(this.root, normalise(prefix))
    if (node === null) return []

    const matches: Article[] = []
    collect(node, matches)

    // The same article is indexed under every word it contains, so one query can hit it twice.
    const seen = new Set<string>()
    const unique = matches.filter((article) => {
      if (seen.has(article.id)) return false
      seen.add(article.id)
      return true
    })
    return topK(unique, k, worseFirst)
  }
}

// ---- Follow-up 3: sorted array plus binary search ----

// Every string with a given prefix is contiguous in sorted order, so two binary searches bound the
// range and no trie is needed.
// Build: O(n log n) sort; query: O(log n + m log k); space: O(n) with no node objects at all.
export class SortedAutocomplete {
  private readonly entries: Array<{ key: string, article: Article }>

  constructor(articles: Article[]) {
    this.entries = articles
      .map((article) => ({ key: normalise(article.title), article }))
      .sort((a, b) => compareStrings(a.key, b.key))
  }

  suggest(prefix: string, k: number): Article[] {
    if (k <= 0) return []

    const key = normalise(prefix)
    const lo = this.lowerBound(key)
    // '￿' sorts above any character a title realistically contains, so it caps the range.
    const hi = this.lowerBound(key + '￿')
    return topK(
      this.entries.slice(lo, hi).map((entry) => entry.article),
      k,
      worseFirst
    )
  }

  private lowerBound(target: string): number {
    let lo = 0
    let hi = this.entries.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (compareStrings(this.entries[mid].key, target) < 0) lo = mid + 1
      else hi = mid
    }
    return lo
  }
}

// Which one: for a help centre of a few thousand articles that changes a few times a day, the
// sorted array. It is twenty lines instead of eighty, it is one contiguous array instead of tens of
// thousands of Map objects, and a rebuild is a sort that takes microseconds. The trie wins when
// updates are constant (insert is O(title length), the array needs a splice or a rebuild) or when
// you need per-node aggregates like "how many articles under this prefix". Neither applies here.

// ---- Follow-up 4: typos ----

// Do not write edit distance under time pressure. The options, cheapest first:
// - Trigram index: map every three-character slice to article ids, score candidates by how many
//   trigrams they share with the query. Catches "passwrod", costs one more index, no new algorithm.
// - Symmetric delete (SymSpell): precompute every one-deletion variant of each word, look the query
//   variants up in a hash map. Fast at query time, heavy on memory.
// - BK-tree over Levenshtein distance: exact and compact, but the query walks a tree of candidates.
// I would reach for trigrams as a fallback that only runs when the exact prefix returns fewer than
// k results, so the common case stays exact and fast. Beyond that, use a search engine.

const articles: Article[] = [
  { id: 'a1', title: 'Reset your password', views: 900 },
  { id: 'a2', title: 'Reset your PIN', views: 120 },
  { id: 'a3', title: 'Refund policy', views: 400 },
  { id: 'a4', title: 'Refund a subscription', views: 400 },
  { id: 'a5', title: 'Billing contacts', views: 50 }
]

const ids = (found: Article[]): string[] => found.map((article) => article.id)

suite('autocomplete', () => {
  const index = new Autocomplete(articles)
  check('top k by views', ids(index.suggest('re', 3)), ['a1', 'a4', 'a3'])
  check('ties break on title', ids(index.suggest('refund', 2)), ['a4', 'a3'])
  check('longer prefix narrows', ids(index.suggest('reset', 5)), ['a1', 'a2'])
  check('k larger than the match count', ids(index.suggest('re', 100)), ['a1', 'a4', 'a3', 'a2'])
})

suite('autocomplete edges', () => {
  const index = new Autocomplete(articles)
  check('case and whitespace ignored', ids(index.suggest('  RES ', 5)), ['a1', 'a2'])
  check('empty prefix returns the global top k', ids(index.suggest('', 2)), ['a1', 'a4'])
  check('no match', index.suggest('zzz', 5), [])
  check('k of zero', index.suggest('re', 0), [])
  check('negative k', index.suggest('re', -1), [])
  check('prefix longer than every title', index.suggest('reset your passwords', 5), [])
  check('empty corpus', new Autocomplete([]).suggest('re', 5), [])

  const dupes = new Autocomplete([
    { id: 'x', title: 'Same title', views: 5 },
    { id: 'y', title: 'Same title', views: 5 }
  ])
  check('duplicate titles both kept', ids(dupes.suggest('same', 5)).sort(), ['x', 'y'])
})

suite('follow-up 2: multi-word', () => {
  const index = new WordAutocomplete([...articles, { id: 'a6', title: 'Refund a refund', views: 10 }])
  check('matches a word in the middle', ids(index.suggest('your', 5)), ['a1', 'a2'])
  check('matches a word at the start too', ids(index.suggest('password', 5)), ['a1'])
  check('an article is returned once per query', ids(index.suggest('refund', 5)), ['a4', 'a3', 'a6'])
  check('unknown word', index.suggest('invoice', 5), [])
})

suite('follow-up 3: sorted array', () => {
  const trie = new Autocomplete(articles)
  const sorted = new SortedAutocomplete(articles)
  check('same answer as the trie', ids(sorted.suggest('re', 3)), ids(trie.suggest('re', 3)))
  check('empty prefix spans everything', ids(sorted.suggest('', 5)), ['a1', 'a4', 'a3', 'a2', 'a5'])
  check('range is exclusive of near misses', ids(sorted.suggest('refund p', 5)), ['a3'])
  check('no match', sorted.suggest('zzz', 5), [])
  check('empty corpus', new SortedAutocomplete([]).suggest('re', 5), [])
})

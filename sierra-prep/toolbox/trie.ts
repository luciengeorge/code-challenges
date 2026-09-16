import { check, suite } from '../lib/check'

type TrieNode = {
  children: Map<string, TrieNode>
  isWord: boolean
  weight: number
}

function makeNode(): TrieNode {
  return { children: new Map(), isWord: false, weight: 0 }
}

// Time: construct an empty trie in O(1); space grows with inserted words.
export class Trie {
  private root: TrieNode = makeNode()

  // Time O(m) for a word of length m; space O(m) worst case for new nodes.
  insert(word: string, weight = 0): void {
    let node = this.root
    for (const char of word) {
      let next = node.children.get(char)
      if (!next) {
        next = makeNode()
        node.children.set(char, next)
      }
      node = next
    }
    node.isWord = true
    node.weight = weight
  }

  // Time O(m), space O(1).
  has(word: string): boolean {
    const node = this.walk(word)
    return node !== undefined && node.isWord
  }

  // Time O(m), space O(1).
  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== undefined
  }

  // Time O(p + S log sigma) where S is the subtree size under the prefix and sigma the alphabet:
  // collect sorts each node's children. Space O(n) for the n words returned.
  wordsWithPrefix(prefix: string, limit?: number): string[] {
    const start = this.walk(prefix)
    if (!start) return []

    const words: string[] = []
    this.collect(start, prefix, words, limit)
    return words
  }

  // Time O(p + n log n) to collect then sort by weight; space O(n).
  topKWithPrefix(prefix: string, k: number): string[] {
    // Guard k first: slice(0, -1) would silently drop the last word instead of returning nothing,
    // and toolbox/min-heap.ts topK returns [] here, so the two agree.
    if (k <= 0) return []
    const words = this.wordsWithPrefix(prefix)
    const weighted = words.map(word => ({ word, weight: this.walk(word)!.weight }))
    weighted.sort((a, b) => b.weight - a.weight || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
    return weighted.slice(0, k).map(entry => entry.word)
  }

  private walk(prefix: string): TrieNode | undefined {
    let node = this.root
    for (const char of prefix) {
      const next = node.children.get(char)
      if (!next) return undefined
      node = next
    }
    return node
  }

  // Depth-first with children sorted at each node, so results come out alphabetically whatever
  // order they were inserted in. That sort is what makes the traversal deterministic, and it is
  // also what costs the log sigma per node in the complexity above.
  private collect(node: TrieNode, prefix: string, words: string[], limit?: number): void {
    if (limit !== undefined && words.length >= limit) return
    if (node.isWord) words.push(prefix)
    for (const [char, child] of [...node.children].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      if (limit !== undefined && words.length >= limit) return
      this.collect(child, prefix + char, words, limit)
    }
  }
}

suite('trie', () => {
  const trie = new Trie()
  const titles: [string, number][] = [
    ['reset password', 10],
    ['reset billing', 3],
    ['refund policy', 7],
    ['refer a friend', 1],
    ['return an item', 5]
  ]
  for (const [title, weight] of titles) trie.insert(title, weight)

  check('has exact word', trie.has('refund policy'), true)
  check('has rejects a partial match', trie.has('refund'), false)
  check('startsWith accepts a partial match', trie.startsWith('ref'), true)
  check('startsWith rejects an unseen prefix', trie.startsWith('zzz'), false)

  check('wordsWithPrefix sorted alphabetically', trie.wordsWithPrefix('re'), [
    'refer a friend', 'refund policy', 'reset billing', 'reset password', 'return an item'
  ])
  check('empty prefix returns every word', trie.wordsWithPrefix('').length, titles.length)
  check('prefix matching nothing returns empty', trie.wordsWithPrefix('xyz'), [])
  check('limit caps the result count', trie.wordsWithPrefix('re', 2).length, 2)

  check('topK picks highest weight first', trie.topKWithPrefix('re', 2), ['reset password', 'refund policy'])

  const ties = new Trie()
  ties.insert('bravo', 5)
  ties.insert('alpha', 5)
  check('equal weight ties break alphabetically', ties.topKWithPrefix('', 2), ['alpha', 'bravo'])
})

suite('topKWithPrefix guards k', () => {
  const guard = new Trie()
  for (const word of ['a', 'aa', 'ab']) guard.insert(word, 1)
  // Without the guard, slice(0, -1) quietly returns everything but the last word.
  check('k of -1 returns nothing', guard.topKWithPrefix('', -1), [])
  check('k of 0 returns nothing', guard.topKWithPrefix('', 0), [])
})

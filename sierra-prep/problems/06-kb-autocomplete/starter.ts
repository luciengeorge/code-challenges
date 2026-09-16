import { check, suite } from '../../lib/check'

type Article = { id: string, title: string, views: number }

// `check` needs a value and an unimplemented method throws before it can produce one, so trap the
// throw and let the message show up as the failure.
function attempt<T>(fn: () => T): T | string {
  try {
    return fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

export class Autocomplete {
  constructor(articles: Article[]) {}

  suggest(prefix: string, k: number): Article[] {
    throw new Error('not implemented')
  }
}

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
  check('top k by views', attempt(() => ids(index.suggest('re', 3))), ['a1', 'a4', 'a3'])
  check('ties break on title', attempt(() => ids(index.suggest('refund', 2))), ['a4', 'a3'])
  check('longer prefix narrows', attempt(() => ids(index.suggest('reset', 5))), ['a1', 'a2'])
  check('k larger than the match count', attempt(() => ids(index.suggest('re', 100))), ['a1', 'a4', 'a3', 'a2'])
})

suite('autocomplete edges', () => {
  const index = new Autocomplete(articles)
  check('case and whitespace ignored', attempt(() => ids(index.suggest('  RES ', 5))), ['a1', 'a2'])
  check('empty prefix returns the global top k', attempt(() => ids(index.suggest('', 2))), ['a1', 'a4'])
  check('no match', attempt(() => index.suggest('zzz', 5)), [])
  check('k of zero', attempt(() => index.suggest('re', 0)), [])
  check('negative k', attempt(() => index.suggest('re', -1)), [])
  check('prefix longer than every title', attempt(() => index.suggest('reset your passwords', 5)), [])
  check('empty corpus', attempt(() => new Autocomplete([]).suggest('re', 5)), [])

  const dupes = new Autocomplete([
    { id: 'x', title: 'Same title', views: 5 },
    { id: 'y', title: 'Same title', views: 5 }
  ])
  check('duplicate titles both kept', attempt(() => ids(dupes.suggest('same', 5)).sort()), ['x', 'y'])
})

// FOLLOW-UP 1: live view counts. No code. Say what you cache and what you recompute when views
// change on every page load.

// FOLLOW-UP 2: multi-word. Write class WordAutocomplete(articles) with the same suggest signature,
// matching a prefix of any word in the title, then uncomment.
// suite('follow-up 2: multi-word', () => {
//   const index = new WordAutocomplete([...articles, { id: 'a6', title: 'Refund a refund', views: 10 }])
//   check('matches a word in the middle', ids(index.suggest('your', 5)), ['a1', 'a2'])
//   check('matches a word at the start too', ids(index.suggest('password', 5)), ['a1'])
//   check('an article is returned once per query', ids(index.suggest('refund', 5)), ['a4', 'a3', 'a6'])
//   check('unknown word', index.suggest('invoice', 5), [])
// })

// FOLLOW-UP 3: sorted array plus binary search. Write class SortedAutocomplete(articles) with the
// same suggest signature and no trie, then uncomment. Then argue for one of the two.
// suite('follow-up 3: sorted array', () => {
//   const trie = new Autocomplete(articles)
//   const sorted = new SortedAutocomplete(articles)
//   check('same answer as the trie', ids(sorted.suggest('re', 3)), ids(trie.suggest('re', 3)))
//   check('empty prefix spans everything', ids(sorted.suggest('', 5)), ['a1', 'a4', 'a3', 'a2', 'a5'])
//   check('range is exclusive of near misses', ids(sorted.suggest('refund p', 5)), ['a3'])
//   check('no match', sorted.suggest('zzz', 5), [])
//   check('empty corpus', new SortedAutocomplete([]).suggest('re', 5), [])
// })

// FOLLOW-UP 4: typos. No code. Name the options for "passwrod", pick one, say why.

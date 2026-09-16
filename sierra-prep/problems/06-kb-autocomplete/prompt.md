# 6. Knowledge base autocomplete

**Budget:** 45 min. Read only this file before you start. Spoiler at the bottom.

## Setup

When a support agent types in the console, suggest help-centre articles.

```ts
type Article = { id: string; title: string; views: number }

class Autocomplete {
  constructor(articles: Article[])
  suggest(prefix: string, k: number): Article[]   // top k by views, ties broken by title
}
```

## Ask these before writing code

- Prefix of the whole title, or of any word in it? "password" should probably find "Reset your
  password". That single question changes the entire data structure, so ask it first.
- Case sensitivity, leading and trailing whitespace, punctuation.
- Empty prefix: everything, or nothing? Both are defensible; pick and state it.
- How big is the corpus, and how often does it change? This decides whether a prebuilt index is worth
  anything.
- Is `k` small relative to the number of matches? If yes, that is a heap.

## Follow-ups the interviewer will reach for

1. **Live view counts.** Views update constantly. If you cached top-k at each trie node, that cache is
   now stale on every page view. What do you actually cache, and what do you recompute?
2. **Multi-word.** Match a prefix against any word in the title. What does the index look like now, and
   what does it cost in memory?
3. **Do you even need a trie?** Sort the titles once and binary search for the prefix range: all
   strings with a given prefix are contiguous. Compare that to the trie on build time, query time,
   memory, and update cost. Have an opinion.
4. **Typos.** "passwrod". Do not implement edit distance under time pressure. Describe the options,
   say what you would reach for, and move on.

## What this is probing

Trie construction and traversal, and a heap for the top-k. But follow-up 3 is the real question: the
sorted-array-plus-binary-search answer is often the better engineering call, and an interviewer asking
it wants to see whether you can argue against the structure you just built.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

Trie keyed by character, `Map<string, node>` children, article ids at terminal nodes. `suggest` walks
the prefix, then collects the subtree and runs a size-k min-heap keyed by `(views, title)`. O(p + m)
to collect m matches plus O(m log k). Sorted-array version: sort titles, `lowerBound(prefix)` and
`lowerBound(prefix + '￿')` bound the range. Multi-word: index every word start, mapping word to
article ids, and dedupe at query time.
</details>

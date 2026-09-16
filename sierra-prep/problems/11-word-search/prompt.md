# 11. Word search

**Evidence: moderate.** Sierra's question bank lists it plainly: *"Given an m x n grid of characters
board and a string word, return true if word exists in the grid."* That is LeetCode 79 with no
disguise, which makes it the one genuinely classic problem in this set. It is here because the rest of
the pack is deliberately unclassical, and you should not walk in with no backtracking in your fingers.

**Budget:** 45 min. Read only this file. Spoiler at the bottom.

## Setup

```ts
function exist(board: string[][], word: string): boolean
```

The word is built from letters of adjacent cells, horizontally or vertically neighbouring. The same
cell may not be used twice in one word.

## Ask these before writing code

- May I mutate the board? Marking visited cells in place and restoring them is the cheapest answer,
  and asking first is the difference between confident and careless.
- Can the word be longer than the number of cells? Cheap early exit.
- Empty word, empty board, single cell.
- Diagonals? The problem says no, but confirm it rather than assuming.
- Case sensitivity.

## Follow-ups the interviewer will reach for

1. **Where.** Return the path of coordinates, not just true.
2. **Many words.** Now you get a list of words to find in one board. Running the whole search per word
   is the obvious answer and it is too slow. A trie over the word list lets one traversal find all of
   them. This is LeetCode 212 and it is the real follow-up.
3. **Pruning.** Count the letters on the board first. If the word needs three Zs and the board has
   one, you are done before you start. Also: search from whichever end of the word is rarer on the
   board, which is a genuinely clever trick to have ready.
4. **Complexity.** State it honestly. It is exponential, and the interviewer wants to hear you say so
   rather than hand-wave.

## What this is probing

Backtracking done cleanly: mark, recurse, unmark, and never forget the unmark. Whether your bounds
check comes before your array access. And on follow-up 2, whether you connect "many words at once" to
a trie without being told, which is the same instinct problem 6 drills.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

DFS from every cell whose letter matches `word[0]`. Mark the cell with a sentinel such as `'#'`,
recurse into the four neighbours with index + 1, restore the letter on the way out. Base case is
`index === word.length`. Time O(m * n * 4^L), space O(L) for the stack. For the multi-word version,
build a trie of the words and walk the board once, carrying the trie node alongside the position, and
prune a branch the moment the node has no matching child.
</details>

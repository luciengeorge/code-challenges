import { check, suite } from '../../lib/check'

// Decisions made up front:
// - The board may be mutated, as long as it is handed back exactly as it came. Marking a cell with a
//   sentinel and restoring it on the way out is cheaper than a separate visited grid, and asking
//   before doing it is the difference between confident and careless.
// - Neighbours are up, down, left and right. No diagonals, confirmed rather than assumed.
// - Letters are compared as written. 'A' does not match 'a'.
// - The empty word is present in every board, including the empty board, because the empty string is
//   a prefix of everything. Worth one sentence out loud; the interviewer may want false.
// - The board is rectangular, so row 0 gives the width.

const MARK = '#'

// Time O(m * n * 4^L) for an m by n board and a word of length L, space O(L) for the recursion.
// Mark, recurse, unmark. Forgetting the unmark is the classic way to fail this.
export function exist(board: string[][], word: string): boolean {
  if (word.length === 0) return true
  const rows = board.length
  const cols = rows === 0 ? 0 : board[0].length
  // A word longer than the board has cells cannot fit, and cells cannot be reused.
  if (word.length > rows * cols) return false

  function search(row: number, col: number, index: number): boolean {
    if (index === word.length) return true
    // Bounds before the array access, always in that order.
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false
    if (board[row][col] !== word[index]) return false

    const letter = board[row][col]
    board[row][col] = MARK
    const found =
      search(row + 1, col, index + 1) ||
      search(row - 1, col, index + 1) ||
      search(row, col + 1, index + 1) ||
      search(row, col - 1, index + 1)
    board[row][col] = letter
    return found
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (search(row, col, 0)) return true
    }
  }
  return false
}

// ---- Follow-up 1: where ----

// Same bounds as exist. The path is built as the recursion descends and popped on the way back out
// of a dead end, so on success it holds exactly the cells used, in order.
export function findPath(board: string[][], word: string): [number, number][] | null {
  if (word.length === 0) return []
  const rows = board.length
  const cols = rows === 0 ? 0 : board[0].length
  if (word.length > rows * cols) return null

  const path: [number, number][] = []

  function search(row: number, col: number, index: number): boolean {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false
    if (board[row][col] !== word[index]) return false

    const letter = board[row][col]
    board[row][col] = MARK
    path.push([row, col])

    const found =
      index === word.length - 1 ||
      search(row + 1, col, index + 1) ||
      search(row - 1, col, index + 1) ||
      search(row, col + 1, index + 1) ||
      search(row, col - 1, index + 1)

    // Restore the board either way; keep the path only on the way to a match.
    board[row][col] = letter
    if (!found) path.pop()
    return found
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (search(row, col, 0)) return path
    }
  }
  return null
}

// ---- Follow-up 2: many words ----

type TrieNode = {
  children: Map<string, TrieNode>
  word: string | null    // the whole word, set on the node where it ends
}

function buildTrie(words: string[]): TrieNode {
  const root: TrieNode = { children: new Map(), word: null }
  for (const word of words) {
    if (word.length === 0) continue
    let node = root
    for (const letter of word) {
      let next = node.children.get(letter)
      if (next === undefined) {
        next = { children: new Map(), word: null }
        node.children.set(letter, next)
      }
      node = next
    }
    node.word = word
  }
  return root
}

// Time O(m * n * 4^L) with L the longest word, plus O(total letters) to build the trie; space the
// same for the trie plus O(L) recursion. Running exist once per word multiplies the board walk by
// the number of words. The trie walks the board once and drops a branch the instant no word in the
// list continues with that letter, which is where the real saving comes from.
export function findWords(board: string[][], words: string[]): string[] {
  const root = buildTrie(words)
  const rows = board.length
  const cols = rows === 0 ? 0 : board[0].length
  const found: string[] = []

  function search(row: number, col: number, node: TrieNode): void {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return
    const letter = board[row][col]
    // The prune, and the reason the sentinel works: no child for this letter, no word this way.
    const next = node.children.get(letter)
    if (next === undefined) return

    if (next.word !== null) {
      found.push(next.word)
      // Clear it so a word that can be spelled two ways is reported once.
      next.word = null
    }

    board[row][col] = MARK
    search(row + 1, col, next)
    search(row - 1, col, next)
    search(row, col + 1, next)
    search(row, col - 1, next)
    board[row][col] = letter
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) search(row, col, root)
  }
  // Alphabetical because the problem does not fix an order and a stable answer is easier to test.
  return found.sort(compareStrings)
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

// ---- Follow-up 3: pruning ----

// Time O(m * n + L) to decide, then the same search as exist. Two cheap wins before any recursion:
// count what the board holds, and start from whichever end of the word is rarer.
export function existPruned(board: string[][], word: string): boolean {
  if (word.length === 0) return true

  const available = countLetters(board.flat())
  const needed = countLetters([...word])
  for (const [letter, count] of needed) {
    // Three Zs wanted, one on the board: done before we start.
    if ((available.get(letter) ?? 0) < count) return false
  }

  // Start from the rarer end. A word ending in Q on a board with one Q gives one starting cell
  // instead of a hundred, and a path read backwards is still a path, so the answer is the same.
  const firstCount = available.get(word[0]) ?? 0
  const lastCount = available.get(word[word.length - 1]) ?? 0
  return exist(board, lastCount < firstCount ? [...word].reverse().join('') : word)
}

function countLetters(letters: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1)
  return counts
}

// ---- Follow-up 4: complexity, stated honestly ----

// exist is O(m * n * 4^L) time and O(L) space. Every one of the m * n cells is a possible start, and
// each step branches four ways for L steps. Marking the current cell removes the way you came in, so
// 3^L is the tighter bound after the first step, and it is still exponential in the length of the
// word. There is no polynomial algorithm hiding here.
// Pruning does not change the class. Letter counts and the rarer-end trick cut the constant hard on
// real boards, and the trie in follow-up 2 removes the per-word factor, but the worst case, a board
// of nothing but 'A' and a word of nothing but 'A', is exactly as bad as it was.
// Say this plainly. Hand-waving "it's roughly linear" on an exponential search is the answer the
// interviewer is listening for, and not in a good way.

const board: string[][] = [
  ['A', 'B', 'C', 'E'],
  ['S', 'F', 'C', 'S'],
  ['A', 'D', 'E', 'E']
]

function copy(grid: string[][]): string[][] {
  return grid.map(row => [...row])
}

suite('exist', () => {
  check('a word that snakes through the board', exist(board, 'ABCCED'), true)
  check('a word along the bottom right', exist(board, 'SEE'), true)
  check('a word that would need a cell twice', exist(board, 'ABCB'), false)
  check('a word going down a column', exist(board, 'ASA'), true)
  check('a single letter', exist(board, 'F'), true)
  check('a letter that is not on the board', exist(board, 'Z'), false)
  check('longer than the board has cells', exist(board, 'A'.repeat(13)), false)
  check('the empty word is everywhere', exist(board, ''), true)
  check('the empty board holds nothing', exist([], 'A'), false)
  check('the empty word on the empty board', exist([], ''), true)
  check('a single cell board', exist([['a']], 'a'), true)
  check('a single cell board that does not match', exist([['a']], 'b'), false)
  check('letters are case-sensitive', exist(board, 'abcced'), false)

  const before = copy(board)
  exist(board, 'ABCCED')
  check('the board comes back exactly as it went in', board, before)
})

suite('findPath', () => {
  check('the cells, in order', findPath(board, 'ABCCED'),
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1]])
  check('a shorter path', findPath(board, 'SEE'), [[1, 3], [2, 3], [2, 2]])
  check('a single letter', findPath(board, 'F'), [[1, 1]])
  check('no path', findPath(board, 'ABCB'), null)
  check('the empty word uses no cells', findPath(board, ''), [])

  const before = copy(board)
  findPath(board, 'ABCCED')
  check('the board survives a successful search too', board, before)
})

suite('findWords', () => {
  const grid: string[][] = [
    ['o', 'a', 'a', 'n'],
    ['e', 't', 'a', 'e'],
    ['i', 'h', 'k', 'r'],
    ['i', 'f', 'l', 'v']
  ]
  check('one walk finds both', findWords(grid, ['oath', 'pea', 'eat', 'rain']), ['eat', 'oath'])
  check('nothing to find', findWords(grid, ['zzz', 'qqq']), [])
  check('an empty word list', findWords(grid, []), [])
  check('a word list on the other board',
    findWords(board, ['ABCCED', 'SEE', 'ABCB', 'OATH']), ['ABCCED', 'SEE'])
  check('a word spellable two ways is reported once',
    findWords([['a', 'a']], ['a']), ['a'])
  check('a word that is a prefix of another',
    findWords([['a', 'b', 'c']], ['ab', 'abc']), ['ab', 'abc'])

  const before = copy(grid)
  findWords(grid, ['oath', 'eat'])
  check('the board comes back clean', grid, before)
})

suite('existPruned', () => {
  check('same answer as exist, found', existPruned(board, 'ABCCED'), true)
  check('same answer as exist, not found', existPruned(board, 'ABCB'), false)
  check('a letter the board does not hold at all', existPruned(board, 'ZEBRA'), false)
  check('more copies of a letter than the board holds', existPruned(board, 'EEEEE'), false)
  check('searching from the rarer end still finds it', existPruned(board, 'SEE'), true)
  check('the reversed search does not invent matches', existPruned(board, 'EES'), true)
  check('the empty word', existPruned(board, ''), true)
})

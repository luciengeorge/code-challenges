import { check, suite } from '../../lib/check'

export function exist(board: string[][], word: string): boolean {
  throw new Error('not implemented')
}

// `check` needs a value and an unimplemented function throws before it can produce one, so trap the
// throw and let the message show up as the failure.
function attempt<T>(fn: () => T): T | string {
  try {
    return fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

const board: string[][] = [
  ['A', 'B', 'C', 'E'],
  ['S', 'F', 'C', 'S'],
  ['A', 'D', 'E', 'E']
]

function copy(grid: string[][]): string[][] {
  return grid.map(row => [...row])
}

suite('exist', () => {
  check('a word that snakes through the board', attempt(() => exist(board, 'ABCCED')), true)
  check('a word along the bottom right', attempt(() => exist(board, 'SEE')), true)
  check('a word that would need a cell twice', attempt(() => exist(board, 'ABCB')), false)
  check('a word going down a column', attempt(() => exist(board, 'ASA')), true)
  check('a single letter', attempt(() => exist(board, 'F')), true)
  check('a letter that is not on the board', attempt(() => exist(board, 'Z')), false)
  check('longer than the board has cells', attempt(() => exist(board, 'A'.repeat(13))), false)
  check('the empty word is everywhere', attempt(() => exist(board, '')), true)
  check('the empty board holds nothing', attempt(() => exist([], 'A')), false)
  check('the empty word on the empty board', attempt(() => exist([], '')), true)
  check('a single cell board', attempt(() => exist([['a']], 'a')), true)
  check('a single cell board that does not match', attempt(() => exist([['a']], 'b')), false)
  check('letters are case-sensitive', attempt(() => exist(board, 'abcced')), false)

  // Asserted alongside the result so it cannot go green before you have written anything. This is
  // the mark-recurse-UNMARK invariant, and forgetting the unmark is the classic backtracking bug.
  const before = copy(board)
  const found = attempt(() => exist(board, 'ABCCED'))
  check('the board comes back exactly as it went in', [found, board], [true, before])
})

// FOLLOW-UP 1: write findPath(board, word) returning the coordinates or null, then uncomment.
// suite('findPath', () => {
//   check('the cells, in order', findPath(board, 'ABCCED'),
//     [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1]])
//   check('a shorter path', findPath(board, 'SEE'), [[1, 3], [2, 3], [2, 2]])
//   check('a single letter', findPath(board, 'F'), [[1, 1]])
//   check('no path', findPath(board, 'ABCB'), null)
//   check('the empty word uses no cells', findPath(board, ''), [])
//
//   const before = copy(board)
//   findPath(board, 'ABCCED')
//   check('the board survives a successful search too', board, before)
// })

// FOLLOW-UP 2: write findWords(board, words) over a trie, then uncomment.
// suite('findWords', () => {
//   const grid: string[][] = [
//     ['o', 'a', 'a', 'n'],
//     ['e', 't', 'a', 'e'],
//     ['i', 'h', 'k', 'r'],
//     ['i', 'f', 'l', 'v']
//   ]
//   check('one walk finds both', findWords(grid, ['oath', 'pea', 'eat', 'rain']), ['eat', 'oath'])
//   check('nothing to find', findWords(grid, ['zzz', 'qqq']), [])
//   check('an empty word list', findWords(grid, []), [])
//   check('a word list on the other board',
//     findWords(board, ['ABCCED', 'SEE', 'ABCB', 'OATH']), ['ABCCED', 'SEE'])
//   check('a word spellable two ways is reported once',
//     findWords([['a', 'a']], ['a']), ['a'])
//   check('a word that is a prefix of another',
//     findWords([['a', 'b', 'c']], ['ab', 'abc']), ['ab', 'abc'])
//
//   const before = copy(grid)
//   findWords(grid, ['oath', 'eat'])
//   check('the board comes back clean', grid, before)
// })

// FOLLOW-UP 3: write existPruned(board, word) using letter counts and the rarer end of the word,
// then uncomment.
// suite('existPruned', () => {
//   check('same answer as exist, found', existPruned(board, 'ABCCED'), true)
//   check('same answer as exist, not found', existPruned(board, 'ABCB'), false)
//   check('a letter the board does not hold at all', existPruned(board, 'ZEBRA'), false)
//   check('more copies of a letter than the board holds', existPruned(board, 'EEEEE'), false)
//   check('searching from the rarer end still finds it', existPruned(board, 'SEE'), true)
//   check('the reversed search does not invent matches', existPruned(board, 'EES'), true)
//   check('the empty word', existPruned(board, ''), true)
// })

// FOLLOW-UP 4: no code. Say the complexity of exist out loud, in both time and space, and say why
// no amount of pruning changes it.

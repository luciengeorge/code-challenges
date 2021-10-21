=begin
Given an m x n board of characters and a list of strings words, return all words on the board.

Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.

Example 1:

Input: board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]
Output: ["eat","oath"]

Example 2:

Input: board = [["a","b"],["c","d"]], words = ["abcb"]
Output: []

Constraints:
  m == board.length
  n == board[i].length
  1 <= m, n <= 12
  board[i][j] is a lowercase English letter.
  1 <= words.length <= 3 * 104
  1 <= words[i].length <= 10
  words[i] consists of lowercase English letters.
  All the strings of words are unique.
=end
require_relative 'trie_node'

# @param {Character[][]} board
# @param {String[]} words
# @return {String[]}
def find_words(board, words)
  res = []
  root = build_trie(words)
  (0...board.length).each do |r|
    (0...board[0].length).each do |c|
      dfs(board, r, c, root, res)
    end
  end

  res
end

def dfs(board, r, c, node, res)
  char = board[r][c]
  i = char.ord - 'a'.ord
  return if char == '#' || node.next[i].nil?

  node = node.next[i]
  if node.word
    res << node.word
    node.word = nil
  end

  board[r][c] = '#'
  dfs(board, r + 1, c, node, res) if r + 1 < board.length
  dfs(board, r - 1, c, node, res) if r - 1 >= 0
  dfs(board, r,  c + 1, node, res) if c + 1 < board[0].length
  dfs(board, r, c - 1, node, res) if c - 1 >= 0
  board[r][c] = char
end

def build_trie(words)
  root = TrieNode.new
  words.each do |word|
    curr = root
    word.each_char do |char|
      i = char.ord - 'a'.ord
      curr.next[i] ||= TrieNode.new
      curr = curr.next[i]
    end
    curr.word = word
  end
  root
end

board = [%w[o a a n], %w[e t a e], %w[i h k r], %w[i f l v]]
words = %w[oath pea eat rain]
p find_words(board, words)

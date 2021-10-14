=begin
Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules:
  Each row must contain the digits 1-9 without repetition.
  Each column must contain the digits 1-9 without repetition.
  Each of the nine 3 x 3 sub-boxes of the grid must contain the digits 1-9 without repetition.

Note:
  A Sudoku board (partially filled) could be valid but is not necessarily solvable.
  Only the filled cells need to be validated according to the mentioned rules.
=end

def valid_sudoku?(board)
  rows = Array.new(board[0].size) { Set.new }
  cols = Array.new(board[0].size) { Set.new }
  squares = Array.new(board[0].size) { Set.new }
  board.each_with_index do |row, row_index|
    row.each_with_index do |_val, col_index|
      val = board[row_index][col_index]
      next if val == '.'

      return false if rows[row_index].include?(val)

      rows[row_index].add(val)

      return false if cols[col_index].include?(val)

      cols[col_index].add(val)

      idx = (row_index / 3 * 3) + col_index / 3
      return false if squares[idx].include?(val)

      squares[idx].add(val)
    end
  end
  true
end

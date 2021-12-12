# https://leetcode.com/problems/search-a-2d-matrix/

def search_matrix(matrix, target)
  matrix.each do |row|
    row.each do |col|
      break if target > row.last

      return true if col == target
    end
  end
  false
end

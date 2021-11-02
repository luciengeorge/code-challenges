# https://leetcode.com/problems/longest-increasing-path-in-a-matrix/

def longest_increasing_path(matrix)
  return 0 if matrix.nil? || matrix.empty?

  r, c, result = matrix.size, matrix[0].size, -Float::INFINITY
  path_sizes = Array.new(r) { Array.new(c, 0) }
  r.times do |i|
    c.times do |j|
      result = [result, dfs(matrix, path_sizes, i, j)].max
    end
  end
  result
end

def dfs(matrix, path_sizes, i, j)
  return path_sizes[i][j] unless path_sizes[i][j].zero?

  curr = matrix[i][j]

  path_sizes[i][j] = 1 + [
    i > 0 && curr < matrix[i - 1][j] ? dfs(matrix, path_sizes, i - 1, j) : 0,
    j > 0 && curr < matrix[i][j - 1] ? dfs(matrix, path_sizes, i, j - 1) : 0,
    i < matrix.size - 1 && curr < matrix[i + 1][j] ? dfs(matrix, path_sizes, i + 1, j) : 0,
    j < matrix[0].size - 1 && curr < matrix[i][j + 1] ? dfs(matrix, path_sizes, i, j + 1) : 0
  ].max
end

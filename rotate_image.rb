# https://leetcode.com/explore/interview/card/google/59/array-and-strings/3052/

def rotate(matrix)
  n = matrix.length
  matrix = transpose(matrix, n)
  # reverse_columns(matrix, n)
end

def transpose(matrix, n)
  (0...n).each do |i|
    (i...n).each do |j|
      matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    end
  end
  matrix
end

def reverse_columns(matrix, n)
  (0...n).each do |i|
    (0...(n / 2)).each do |j|
      matrix[i][j], matrix[i][n - j - 1] = matrix[i][n - j - 1], matrix[i][j]
    end
  end
  matrix
end

matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
p rotate(matrix)

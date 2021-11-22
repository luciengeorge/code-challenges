require 'set'

def update_matrix(matrix)
  visited = Set.new
  queue = []

  matrix.size.times do |i|
    matrix.first.size.times do |j|
      next unless matrix[i][j] == 0

      visited.add([i, j])
      queue.push([i, j])
    end
  end

  directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  while queue.any?
    i, j = queue.shift
    neighbors = directions.map { |y, x| [i + y, j + x] }

    neighbors.each do |(y, x)|
      next if y.negative? || x.negative? || y >= matrix.size || x >= matrix.first.size || visited.include?([y, x])

      visited.add([y, x])
      queue.push([y, x])
      matrix[y][x] = matrix[i][j] + 1
    end
  end
  matrix
end

mat = [[0, 0, 0], [0, 1, 0], [1, 1, 1]]
p update_matrix(mat)

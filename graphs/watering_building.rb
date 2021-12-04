def can_water?(matrix, target)
  max_x, max_y = find_highest(matrix)

  visited = []
  stack = [[max_x, max_y]]
  directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]

  while stack.any?
    i, j = stack.pop
    next if visited.include? [i, j]

    visited.push([i, j])

    return visited if target == [i, j]

    neighbors = directions.map { |x, y| [i + x, j + y] }
    neighbors.each do |x, y|
      next if x < 0 || y < 0 || x > matrix.size - 1 || y > matrix[0].size - 1 || matrix[x][y] > matrix[i][j]

      stack.push([x, y])
    end
  end
  false
end

def find_highest(matrix)
  max_x, max_y = [0, 0]
  matrix.size.times do |i|
    matrix[0].size.times do |j|
      next if matrix[max_x][max_y] >= matrix[i][j]

      max_x, max_y = [i, j]
    end
  end
  [max_x, max_y]
end

matrix = [
  [1, 9, 7, 3],
  [2, 4, 5, 3],
  [7, 5, 3, 1],
  [4, 3, 1, 3]
]

p can_water?(matrix, [2, 1])

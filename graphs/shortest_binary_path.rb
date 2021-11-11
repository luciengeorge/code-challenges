# https://leetcode.com/problems/shortest-path-in-binary-matrix/

def shortest_path_binary_matrix(grid)
  return -1 if grid[0][0] == 1

  visited = Array.new(grid.size) { Array.new(grid[0].size, false) }
  queue = [[0, 0, 1]]
  directions = [[-1, -1], [-1, 0], [0, -1], [1, -1], [1, 0], [0, 1], [1, 1], [-1, 1]]

  while queue.any?
    x, y, count = queue.shift
    return count if x == y && x == grid.size - 1

    neighbors = directions.map { |x_dir, y_dir| [x + x_dir, y + y_dir] }

    neighbors.each do |x1, y1|
      next unless x1 >= 0 && y1 >= 0 && x1 < grid.size && y1 < grid.size

      queue.push([x1, y1, count + 1]) unless visited[x1][y1] || grid[x1][y1] == 1
      visited[x1][y1] = true
    end
  end
  -1
end

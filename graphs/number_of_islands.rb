# https://leetcode.com/problems/number-of-islands/

def num_islands(grid)
  count = 0
  grid.size.times do |row|
    grid[0].size.times do |col|
      count += bfs([[row, col]], grid) if grid[row][col] == '1'
    end
  end
  count
end

def bfs(queue, grid)
  while queue.any?
    row, col = queue.shift
    next if grid[row][col] != '1'

    neighbors = directions.map { |x, y| [row + x, col + y] }
    neighbors.each do |x, y|
      next if x.negative? || y.negative? || x >= grid.size || y >= grid[0].size || grid[x][y] != '1'

      queue.push([x, y])
    end
    grid[row][col] = '-1'
  end
  1
end

def directions
  [[0,1], [0, -1], [1, 0], [-1, 0]]
end

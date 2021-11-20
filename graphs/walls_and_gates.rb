# https://leetcode.com/problems/walls-and-gates/

# @param {Integer[][]} rooms
# @return {Void} Do not return anything, modify rooms in-place instead.
def walls_and_gates(rooms)
  queue = []
  directions = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  rooms.size.times do |row|
    rooms[0].size.times do |col|
      next unless rooms[row][col] == 0

      queue << [row, col]
    end
  end

  while queue.any?
    row, col = queue.shift

    neighbors = directions.map { |(x_offset, y_offset)| [row + x_offset, col + y_offset] }
    neighbors.each do |(new_row, new_col)|
      update_neighbor(rooms, rooms[row][col], new_row, new_col, queue)
    end
  end
end

def update_neighbor(rooms, current, new_row, new_col, queue)
  return if new_row < 0 || new_col < 0 || new_row >= rooms.size || new_col >= rooms[0].size || rooms[new_row][new_col] != 2147483647

  rooms[new_row][new_col] = current + 1
  queue << [new_row, new_col]
end

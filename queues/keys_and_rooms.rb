# https://leetcode.com/problems/keys-and-rooms/

def can_visit_all_rooms(rooms)
  visited = Array.new(rooms.size, false)
  visited[0] = true
  queue = rooms.first

  while queue.any?
    room = queue.shift
    next if visited[room]

    queue += rooms[room]
    visited[room] = true
  end
  visited.all? { |room| room == true }
end

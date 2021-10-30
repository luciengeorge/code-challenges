require_relative 'node'

def bfs(queue, visited)
  while queue.any?
    node, offset = queue.shift.values_at(:node, :offset)
    visited << { node: node, offset: offset }

    queue.append({ node: node.left, offset: offset - 1 }) if node.left
    queue.append({ node: node.right, offset: offset + 1 }) if node.right
  end
end

def vertical_order(root)
  return [] if root.nil?

  queue = [{ node: root, offset: 0 }]
  visited = []
  bfs(queue, visited)
  data = {}
  visited.group_by { |el| el[:offset] }.each do |key, values|
    data[key] = values.map { |el| el[:node].val }
  end
  data.sort_by { |offset, _| offset }.map(&:last)
end

node1 = Node.new(4)
node2 = Node.new(0)
node3 = Node.new(1)
node4 = Node.new(7)
node5 = Node.new(9, node1, node2)
node6 = Node.new(8, node3, node4)
root = Node.new(3, node5, node6)

p vertical_order(root)

require_relative 'node'

def bfs(root, target)
  visited = []
  queue = [[root, [root]]]

  while queue.any?
    curr, path = queue.shift
    next if visited.include? curr

    visited.push(curr)

    return path.map(&:val) if curr.val == target

    curr.neighbors.each do |neighbor|
      next if visited.include?(neighbor)

      queue.push([neighbor, path + [neighbor]])
    end
  end
end

def dfs(root, target)
  visited = []
  stack = [root]

  while stack.any?
    curr = stack.pop
    visited.push(curr)

    return true if curr.val == target

    curr.neighbors.each do |neighbor|
      stack.push(neighbor) unless visited.include?(neighbor)
    end
  end
  false
end

root = Node.new(3)
node1 = Node.new(4)
node2 = Node.new(5)
node3 = Node.new(2)
node4 = Node.new(10)
node5 = Node.new(1)

root.add_edge(node1)
node1.add_edge(root)
root.add_edge(node2)
node2.add_edge(root)
root.add_edge(node3)
node3.add_edge(root)
node1.add_edge(node2)
node2.add_edge(node1)
node2.add_edge(node3)
node3.add_edge(node2)
node2.add_edge(node4)
node4.add_edge(node2)
node2.add_edge(node5)
node5.add_edge(node2)
node3.add_edge(node5)
node5.add_edge(node3)

p bfs(root, 10)
p dfs(root, 1)

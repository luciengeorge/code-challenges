# https://leetcode.com/problems/populating-next-right-pointers-in-each-node/submissions/

def connect(root)
  return nil if root.nil?

  queue = [{ node: root, depth: 0 }]
  levels = []

  while queue.any?
    node, depth = queue.shift.values_at(:node, :depth)

    levels[depth] = [] unless levels[depth]
    levels[depth].last.next = node if levels[depth].any?
    levels[depth].push(node)

    queue.push({ node: node.left, depth: depth + 1 }) if node.left
    queue.push({ node: node.right, depth: depth + 1 }) if node.right
  end

  root
end

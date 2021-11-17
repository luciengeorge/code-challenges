# https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/

def traverse(nodes, queue, depth = 0)
  while queue.any?
    node, depth = queue.shift.values_at(:node, :depth)

    nodes[depth] = [] unless nodes[depth]
    nodes[depth].send(depth.even? ? :push : :unshift, node.val)

    queue.push({ node: node.left, depth: depth + 1 }) if node.left
    queue.push({ node: node.right, depth: depth + 1 }) if node.right
  end
end

def zigzag_level_order(root)
  return [] if root.nil?

  nodes = {}
  queue = [{ node: root, depth: 0 }]
  traverse(nodes, queue)
  nodes.values
end

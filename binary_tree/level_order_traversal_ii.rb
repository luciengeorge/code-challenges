# https://leetcode.com/problems/binary-tree-level-order-traversal-ii/

def level_order_bottom(root)
    return [] if root.nil?

    stack = [{ node: root, depth: 0 }]
    values = []
    while stack.any?
      node, depth = stack.pop.values_at(:node, :depth)
      values[depth] = [] unless values[depth]

      values[depth].push(node.val)
      stack.push({ node: node.right, depth: depth + 1 }) if node.right
      stack.push({ node: node.left, depth: depth + 1 }) if node.left
    end
    values.reverse
end

# https://leetcode.com/problems/minimum-depth-of-binary-tree/

# Solution 1
def traverse(node, depths, depth = 0)
  return if node.nil?

  depths.push(depth + 1) if node.right.nil? && node.left.nil?

  traverse(node.left, depths, depth + 1)
  traverse(node.right, depths, depth + 1)
end

def min_depth(root)
    return 0 if root.nil?

    depths = []
    traverse(root, depths)
    depths.min
end

# Solution 2
def min_depth(root)
  return 0 if root.nil?

  min_depth = Float::INFINITY
  queue = [{ node: root, depth: 1 }]
  while queue.any?
    node, depth = queue.shift.values_at(:node, :depth)

    if node.right.nil? && node.left.nil?
      min_depth = [min_depth, depth].min
    end

    queue.push({ node: node.left, depth: depth + 1 }) if node.left
    queue.push({ node: node.right, depth: depth + 1 }) if node.right
  end
  min_depth
end

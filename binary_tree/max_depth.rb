def traverse(node, depths, current_depth = 1)
  return if node.nil?

  depths.push(current_depth)
  traverse(node.left, depths, current_depth + 1)
  traverse(node.right, depths, current_depth + 1)
end


def max_depth(root)
  return 0 if root.nil?

  depths = []
  traverse(root, depths)
  depths.max
end

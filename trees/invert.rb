# https://leetcode.com/problems/invert-binary-tree/

def invert_tree(root)
  return unless root

  node = root
  invert_tree(node.left)
  invert_tree(node.right)

  node.left, node.right = node.right, node.left
  node
end

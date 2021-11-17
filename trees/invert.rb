# https://leetcode.com/problems/invert-binary-tree/

def invert_tree(root)
  return unless root

  node = root
  invert_tree(node.left)
  invert_tree(node.right)

  temp = node.left
  node.left = node.right
  node.right = temp
  node
end

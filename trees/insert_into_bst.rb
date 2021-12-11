# https://leetcode.com/problems/insert-into-a-binary-search-tree/submissions/

def insert_into_bst(root, val)
  return TreeNode.new(val) unless root

  if !root.left && val < root.val
    root.left = TreeNode.new(val)
  elsif !root.right && val > root.val
    root.right = TreeNode.new(val)
  elsif val < root.val
    insert_into_bst(root.left, val)
  else
    insert_into_bst(root.right, val)
  end
  root
end

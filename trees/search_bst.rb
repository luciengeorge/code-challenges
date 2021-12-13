# https://leetcode.com/problems/search-in-a-binary-search-tree/
def search_bst(root, val)
  return root if root.val == val

  if val < root.val
    search_bst(root.left, val) if root.left
  else
    search_bst(root.right, val) if root.right
  end
end

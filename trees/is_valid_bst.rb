# https://leetcode.com/problems/validate-binary-search-tree/submissions/

def valid?(root, min = -Float::INFINITY, max = Float::INFINITY)
  return true unless root
  return false if root.val >= max || root.val <= min

  valid?(root.left, min, root.val) && valid?(root.right, root.val, max)
end

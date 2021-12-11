# https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/submissions/

def lowest_common_ancestor(root, p, q)
  return p if find(p, q)
  return q if find(q, p)

  if find(root.left, p) && find(root.left, q)
    lowest_common_ancestor(root.left, p, q)
  elsif find(root.right, p) && find(root.right, q)
    lowest_common_ancestor(root.right, p, q)
  else
    root
  end
end

def find(root, target)
  if root
    return true if root == target

    find(root.left, target) || find(root.right, target)
  else
    false
  end
end

# https://leetcode.com/problems/find-leaves-of-binary-tree/

class TreeNode
  attr_accessor :val, :left, :right

  def initialize(val = 0, left = nil, right = nil)
    @val = val
    @left = left
    @right = right
  end

  def leaf?
    right.nil? && left.nil?
  end
end

def find_leaves(root)
  return [] if root.nil?
  return [[root.val]] if root.leaf?

  queue = [root]
  leaves = []

  while queue.any?
    parent = queue.shift

    left_child = parent.left
    right_child = parent.right
    if left_child && left_child.leaf?
      leaves << left_child.val
      parent.left = nil
    else
      queue << left_child if left_child
    end
    if right_child && right_child.leaf?
      leaves << right_child.val
      parent.right = nil
    else
      queue << right_child if right_child
    end
  end
  [leaves].concat(find_leaves(root))
end

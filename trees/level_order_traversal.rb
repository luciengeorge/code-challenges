=begin
Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).
Example 1:

Input: root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]

Example 2:

Input: root = [1]
Output: [[1]]

Example 3:

Input: root = []
Output: []

Constraints:

  The number of nodes in the tree is in the range [0, 2000].
  -1000 <= Node.val <= 1000
=end

# Definition for a binary tree node.
# class TreeNode
#     attr_accessor :val, :left, :right
#     def initialize(val = 0, left = nil, right = nil)
#         @val = val
#         @left = left
#         @right = right
#     end
# end
# @param {TreeNode} root
# @return {Integer[][]}
def level_order(root)
  return [] if root.nil?

  queue = [{ node: root, depth: 0 }]
  levels = []
  while queue.any?
    element = queue.shift
    levels[element[:depth]] = [] unless levels[element[:depth]]
    levels[element[:depth]] += [element[:node].val]

    queue.append({ node: element[:node].left, depth: element[:depth] + 1 }) if element[:node].left
    queue.append({ node: element[:node].right, depth: element[:depth] + 1 }) if element[:node].right
  end
  levels
end

=begin
Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal of the same tree, construct and return the binary tree.

Example 1:

Input: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
Output: [3,9,20,null,null,15,7]

Example 2:

Input: preorder = [-1], inorder = [-1]
Output: [-1]

Constraints:
  1 <= preorder.length <= 3000
  inorder.length == preorder.length
  -3000 <= preorder[i], inorder[i] <= 3000
  preorder and inorder consist of unique values.
  Each value of inorder also appears in preorder.
  preorder is guaranteed to be the preorder traversal of the tree.
  inorder is guaranteed to be the inorder traversal of the tree.
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
# @param {Integer[]} preorder
# @param {Integer[]} inorder
# @return {TreeNode}
def build_tree(preorder, inorder)
  return nil if preorder.empty? || inorder.empty?

  node = TreeNode.new(preorder.first)
  index = inorder.find_index(preorder.first)
  preorder.shift
  node.left = build_tree(preorder, inorder[0..(index - 1)]) unless index.zero?
  node.right = build_tree(preorder, inorder[(index + 1)..-1]) unless index == inorder.size - 1
  node
end

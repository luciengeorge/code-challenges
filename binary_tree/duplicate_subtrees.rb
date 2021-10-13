# Definition for a binary tree node.
# class TreeNode
#     attr_accessor :val, :left, :right
#     def initialize(val = 0, left = nil, right = nil)
#         @val = val
#         @left = left
#         @right = right
#     end
# end

def find_duplicate_subtrees(root)
  @path = Hash.new(0)
  @duplicates = []
  find_duplicates(root)
  @duplicates
end

def find_duplicates(node)
  return '' if node.nil?

  path = [node.val, find_duplicates(node.left), find_duplicates(node.right)].join(',')
  @duplicates << node if @path[path] == 1
  @path[path] += 1

  path
end

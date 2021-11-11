# https://leetcode.com/problems/symmetric-tree/

require_relative 'node'

def symmetric?(root)
  return true if root.nil?

  left_tree(root) == right_tree(root)
end

def left_tree(node, tree = [], level = 0)
  return [] if node.nil?

  left_tree(node.left, tree, level + 1)
  tree.push("#{node.val}-#{level}")
  left_tree(node.right, tree, level + 1)
  tree
end

def right_tree(node, tree = [], level = 0)
  return [] if node.nil?

  right_tree(node.right, tree, level + 1)
  tree.push("#{node.val}-#{level}")
  right_tree(node.left, tree, level + 1)
  tree
end

node1 = Node.new(3)
node2 = Node.new(4)
node3 = Node.new(2, node1, node2)
node4 = Node.new(4)
node5 = Node.new(3)
node6 = Node.new(2, node4, node5)
root = Node.new(1, node3, node6)

p symmetric?(root)

=begin
Given a binary tree, get the average value at each level of the tree

      4
     /  \
    7    9
   / \    \
  10  2    6
       \
        6
       /
      2
=end

require_relative 'node'

def collect(node, data, depth = 0)
  return nil unless node

  data[depth] = [] unless data.key?(depth)

  data[depth] << node.val

  collect(node.left, data, depth + 1)
  collect(node.right, data, depth + 1)
end

def collect_v2(node, data, depth = 0)
  return nil unless node

  data[depth] = { val: 0, quantity: 0 } unless data.key?(depth)

  data[depth][:val] += node.val
  data[depth][:quantity] += 1

  collect_v2(node.left, data, depth + 1)
  collect_v2(node.right, data, depth + 1)
end

def compute_avg(root)
  data = {}
  results = []
  collect(root, data)
  depth = 0
  while data.key?(depth)
    values = data[depth]
    results << values.sum.fdiv(values.size)
    depth += 1
  end
  results
end

def compute_avg_v2(root)
  data = {}
  results = []
  collect_v2(root, data)
  depth = 0
  while data.key?(depth)
    vals = data[depth]
    results << vals[:val] / vals[:quantity]
    depth += 1
  end
  results
end

# TESTS

node1 = Node.new(2)
node2 = Node.new(6, node1)
node3 = Node.new(2, nil, node2)
node4 = Node.new(10)
node5 = Node.new(7, node4, node3)
node6 = Node.new(6)
node7 = Node.new(9, nil, node6)
root = Node.new(4, node5, node7)

p compute_avg(root)
p compute_avg_v2(root)

require_relative 'node'

# class Node
#   attr_reader :val, :left, :right

#   def initialize(val, left = nil, right = nil)
#     @val = val
#     @left = left
#     @right = right
#   end
# end

five = Node.new(5)
four = Node.new(4)
three = Node.new(3)
two = Node.new(2, four, five)
root = Node.new(1, two, three)

def level_order_traversal(node)
  queue = [node]

  vals = []
  while queue.any?
    curr = queue.shift
    vals.push(curr.val)

    queue.push(curr.left) if curr.left
    queue.push(curr.right) if curr.right
  end
  vals
end

p level_order_traversal(root)

# root, left, right
def preorder_traversal(node)
  stack = [node]

  vals = []

  while stack.any?
    curr = stack.pop

    vals.push(curr.val)

    stack.push(curr.right) if curr.right
    stack.push(curr.left) if curr.left
  end
  vals
end

p preorder_traversal(root)

# left, root, right
def inorder_traversal(node)
  return [] unless node

  inorder_traversal(node.left) + [node.val] + inorder_traversal(node.right)
end

p inorder_traversal(root)

# left, right, root
def postorder_traversal(root)
  return [] unless root

  postorder_traversal(root.left) + postorder_traversal(root.right) + [root.val]
end

p postorder_traversal(root)

require_relative 'node'

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

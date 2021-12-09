# https://leetcode.com/problems/path-sum/

def path_sum?(root, target_sum)
  return false unless root

  paths = []
  sum_path(root, [root], paths)

  paths.include? target_sum
end

def sum_path(node, path, paths)
  sum_path(node.left, path + [node.left], paths) if node.left
  sum_path(node.right, path + [node.right], paths) if node.right

  paths << path.map(&:val).sum unless node.left || node.right
end

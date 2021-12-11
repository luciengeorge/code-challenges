# https://leetcode.com/problems/two-sum-iv-input-is-a-bst/submissions/

def find_target(root, k)
  targets = Hash.new(0)

  queue = [ root ]

  while queue.any?
    curr = queue.shift
    target = k - curr.val
    return true if targets.key?(curr.val)

    targets[target] = curr.val
    queue.push(curr.left) if curr.left
    queue.push(curr.right) if curr.right
  end
  false
end

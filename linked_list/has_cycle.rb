# https://leetcode.com/problems/linked-list-cycle/

def has_cycle(head)
  visited = Set.new

  curr = head

  while curr
    return true if visited.include? curr

    visited.add curr
    curr = curr.next
  end
  false
end

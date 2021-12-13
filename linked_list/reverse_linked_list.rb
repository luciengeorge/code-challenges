# https://leetcode.com/problems/reverse-linked-list/

def reverse_list(head)
  return nil unless head

  stack = []

  while head
    stack.push(head)
    head = head.next
  end

  reversed_list = ListNode.new
  curr = reversed_list
  while stack.any?
    curr.val = stack.pop.val
    next unless stack.any?

    curr.next = ListNode.new
    curr = curr.next
  end
  reversed_list
end

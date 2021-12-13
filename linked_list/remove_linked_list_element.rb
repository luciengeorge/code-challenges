# https://leetcode.com/problems/remove-linked-list-elements/

def remove_elements(head, val)
  return nil unless head

  curr = head
  prev = nil
  while curr
    if curr.val == val && prev
      prev.next = curr.next
      curr = curr.next
    elsif curr.val == val
      head = head.next
      curr = head
    else
      prev = curr
      curr = curr.next
    end
  end
  head
end

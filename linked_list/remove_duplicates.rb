# https://leetcode.com/problems/remove-duplicates-from-sorted-list/

def delete_duplicates(head)
  values = Set.new

  curr = head
  prev = nil
  while curr
    if values.include?(curr.val) && prev
      prev.next = curr.next
    elsif values.include?(curr.val)
      head = head.next
    else
      values.add curr.val
      prev = curr
    end
    curr = curr.next
  end
  head
end

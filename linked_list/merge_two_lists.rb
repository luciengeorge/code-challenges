# https://leetcode.com/problems/merge-two-sorted-lists/

def merge_two_lists(list1, list2)
  return nil unless list1 || list2

  list = ListNode.new
  curr = list
  while list1 || list2
    if list1 && list2
      if list1.val < list2.val
        curr.val = list1.val
        list1 = list1.next
      else
        curr.val = list2.val
        list2 = list2.next
      end
    elsif list1
      curr.val = list1.val
      list1 = list1.next
    else
      curr.val = list2.val
      list2 = list2.next
    end
    next unless list1 || list2

    curr.next = ListNode.new
    curr = curr.next
  end
  list
end

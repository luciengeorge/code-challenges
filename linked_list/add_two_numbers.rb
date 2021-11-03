# https://leetcode.com/problems/add-two-numbers/

def add_two_numbers(l1, l2)
  node = l1
  str1 = "#{node.val}"
  while node.next
    node = node.next
    str1 += node.val.to_s
  end

  node = l2
  str2 = "#{node.val}"
  while node.next
    node = node.next
    str2 += node.val.to_s
  end

  sum = (str1.reverse.to_i + str2.reverse.to_i).to_s.chars.reverse
  root = ListNode.new
  curr = root
  while sum.any?
    val = sum.shift
    curr.val = val
    break if sum.empty?

    curr.next = ListNode.new
    curr = curr.next
  end
  root
end

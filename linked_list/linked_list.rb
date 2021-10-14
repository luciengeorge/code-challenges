=begin
Design your implementation of the linked list. You can choose to use a singly or doubly linked list.
A node in a singly linked list should have two attributes: val and next. val is the value of the current node, and next is a pointer/reference to the next node.
If you want to use the doubly linked list, you will need one more attribute prev to indicate the previous node in the linked list. Assume all nodes in the linked list are 0-indexed.

Implement the MyLinkedList class:
  MyLinkedList() Initializes the MyLinkedList object.
  int get(int index) Get the value of the indexth node in the linked list. If the index is invalid, return -1.
  void addAtHead(int val) Add a node of value val before the first element of the linked list. After the insertion, the new node will be the first node of the linked list.
  void addAtTail(int val) Append a node of value val as the last element of the linked list.
  void addAtIndex(int index, int val) Add a node of value val before the indexth node in the linked list. If index equals the length of the linked list, the node will be appended to the end of the linked list. If index is greater than the length, the node will not be inserted.
  void deleteAtIndex(int index) Delete the indexth node in the linked list, if the index is valid.

Example 1:

Input
["MyLinkedList", "addAtHead", "addAtTail", "addAtIndex", "get", "deleteAtIndex", "get"]
[[], [1], [3], [1, 2], [1], [1], [1]]
Output
[null, null, null, null, 2, null, 3]

Explanation
MyLinkedList myLinkedList = new MyLinkedList();
myLinkedList.addAtHead(1);
myLinkedList.addAtTail(3);
myLinkedList.addAtIndex(1, 2);    // linked list becomes 1->2->3
myLinkedList.get(1);              // return 2
myLinkedList.deleteAtIndex(1);    // now the linked list is 1->3
myLinkedList.get(1);              // return 3

Constraints:
  0 <= index, val <= 1000
  Please do not use the built-in LinkedList library.
  At most 2000 calls will be made to get, addAtHead, addAtTail, addAtIndex and deleteAtIndex.
=end


require_relative 'node'

class MyLinkedList
  def initialize()
    @head = nil
  end


=begin
  :type index: Integer
  :rtype: Integer
=end
  def get(index)
    cur = 0
    node = @head

    while node
      return node.val if cur == index

      node = node.next
      cur +=1
    end
    return -1
  end


=begin
  :type val: Integer
  :rtype: Void
=end
  def add_at_head(val)
      node = @head
      @head = Node.new(val, node)
  end


=begin
    :type val: Integer
    :rtype: Void
=end
  def add_at_tail(val)
    if @head
      node = @head

      while node.next
        node = node.next
      end

      node.next = Node.new(val)
    else
      @head = Node.new(val)
    end
  end


=begin
  :type index: Integer
  :type val: Integer
  :rtype: Void
=end
  def add_at_index(index, val)
    if index.zero?
      add_at_head(val)
    else
      new_node = Node.new(val)
      previous = @head
      node = previous&.next
      cur = 1
      while cur != index
        previous = node
        node = node&.next
        cur += 1
      end

      new_node.next = node
      previous.next = new_node if previous
    end
  end


=begin
  :type index: Integer
  :rtype: Void
=end
  def delete_at_index(index)
    return if @head.nil?

    prev = nil
    node = @head
    next_node = node.next
    cur = 0
    while cur != index
      prev = node
      node = next_node
      next_node = next_node&.next
      cur += 1
    end
    return unless node
    if prev
      prev.next = next_node
    else
      @head = next_node
    end
  end
end

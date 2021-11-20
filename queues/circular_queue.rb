# https://leetcode.com/explore/learn/card/queue-stack/228/first-in-first-out-data-structure/1337/

class MyCircularQueue
=begin
  :type k: Integer
=end
  def initialize(size)
    @size = size
    @data = Array.new(@size)
    @head = -1
    @tail = -1
  end

=begin
  :type value: Integer
  :rtype: Boolean
=end
  def en_queue(value)
    return false if full?

    @head = 0 if empty?

    @tail = (@tail + 1) % @size
    @data[@tail] = value
    return true
  end

=begin
  :rtype: Boolean
=end
  def de_queue
    return false if empty?

    if @head == @tail
      @head = -1
      @tail = -1
      return true
    end

    @head = (@head + 1) % @size
    return true
  end

=begin
  :rtype: Integer
=end
  def front
    return -1 if empty?

    @data[@head]
  end

=begin
  :rtype: Integer
=end
  def rear
    return -1 if empty?

    @data[@tail]
  end

=begin
  :rtype: Boolean
=end
  def empty?
    @head == -1
  end

=begin
  :rtype: Boolean
=end
  def full?
    (@tail + 1) % @size == @head
  end
end

# Your MyCircularQueue object will be instantiated and called as such:
# obj = MyCircularQueue.new(k)
# param_1 = obj.en_queue(value)
# param_2 = obj.de_queue()
# param_3 = obj.front()
# param_4 = obj.rear()
# param_5 = obj.empty?()
# param_6 = obj.full?()

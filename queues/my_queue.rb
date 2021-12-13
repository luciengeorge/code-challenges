# https://leetcode.com/problems/implement-queue-using-stacks/

class MyQueue
  def initialize
    @in = []
    @out = []
    @size = 0
  end

  def push(el)
    @in << el
    @size += 1
  end

  def peek
    if @out.empty?
      return nil if @in.empty?

      while @in.any?
        @out << @in.pop
      end
    end
    @out.last
  end

  def pop
    if @out.empty?
      return nil if @in.empty?

      while @in.any?
        @out << @in.pop
      end
    end
    @size -= 1
    @out.pop
  end

  def empty
    @size.zero?
  end
end

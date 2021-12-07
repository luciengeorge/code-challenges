# https://leetcode.com/problems/implement-queue-using-stacks/
class MyQueue
  def initialize
    @stack_in = []
    @stack_out = []
    @size = 0
  end

  def push(x)
    @size += 1
    @stack_in.push(x)
  end

  def pop
    if @stack_out.empty?
      return nil if @stack_in.empty?

      @stack_out.push(@stack_in.pop) while @stack_in.any?
    end
    @size -= 1
    @stack_out.pop
  end

  def peek
    if @stack_out.empty?
      return nil if @stack_in.empty?

      while @stack_in.any?
        @stack_out.push(@stack_in.pop)
      end
    end
    @stack_out.last
  end

  def empty
    @size.zero?
  end
end

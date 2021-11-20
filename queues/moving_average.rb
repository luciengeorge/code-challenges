class MovingAverage

=begin
    :type size: Integer
=end
  def initialize(size)
    @size = size
    @data = []
  end


=begin
  :type val: Integer
  :rtype: Float
=end
  def next(val)
    if @data.size == @size
      @data.shift
    end
    @data.push(val)
    @data.sum.fdiv @data.size
  end
end

# Your MovingAverage object will be instantiated and called as such:
# obj = MovingAverage.new(size)
# param_1 = obj.next(val)

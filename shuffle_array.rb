# https://leetcode.com/problems/shuffle-an-array/

class Solution
  def initialize(nums)
    @nums = nums
  end

  def reset
    @nums
  end

  def shuffle
    arr = []
    dup = @nums.dup
    size = @nums.size

    while size.positive?
      arr << dup.delete_at(rand(size))
      size -= 1
    end
    arr
  end
end

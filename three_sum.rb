# https://leetcode.com/problems/3sum/
require 'set'

def three_sum(nums)
  targets = {}
  target = 0
  results = Set.new
  nums = nums.sort
  nums.each_with_index do |num, index|
    targets[num] = index
  end
  targets.each do |num, index|
    new_target = target - num
    i = 0
    j = nums.size - 1
    while i < j
      if i == index
        i += 1
        next
      end
      if j == index
        j -= 1
        next
      end

      if nums[i] + nums[j] == new_target
        results << [num, nums[i], nums[j]].sort
        i += 1
        j -= 1
      elsif nums[i] + nums[j] > new_target
        j -= 1
      else
        i += 1
      end
    end
  end
  results.to_a
end

nums = [-1, 0, 1, 2, -1, -4]
p three_sum(nums)

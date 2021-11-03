# https://leetcode.com/problems/two-sum/

def two_sum(nums, target)
  targets = {}
  nums.each_with_index do |num, index|
    missing_value = target - num
    return [targets[num], index] if targets.key?(num)

    targets[missing_value] = index
  end
  return []
end

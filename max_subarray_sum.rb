# https://leetcode.com/problems/maximum-subarray/

def max_sub_array(nums)
  sum = nums[0]
  arr = Array.new(0)
  arr[0] = nums[0]
  nums[1..].each_with_index do |num, index|
    max = [num, num + arr[index - 1]].max
    arr[index] = max
    sum = [sum, max].max
  end
  sum
end

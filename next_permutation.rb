# https://leetcode.com/explore/interview/card/google/59/array-and-strings/3050/

def next_permutation(nums)
  n = nums.length - 1
  i = n - 1
  i -= 1 while nums[i + 1] <= nums[i] && i >= 0
  p i
  if i >= 0
    j = n
    j -= 1 while nums[j] <= nums[i]
    nums[i], nums[j] = nums[j], nums[i] # swap
  end
  p nums
  a = i + 1
  b = n
  # reverse remaining
  while a < b
    nums[a], nums[b] = nums[b], nums[a]
    a += 1
    b -= 1
  end
  nums
end

nums = [1, 5, 6]
p next_permutation(nums)

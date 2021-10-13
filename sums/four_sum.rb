def four_sum(nums, target)
  length = nums.length - 1
  return [] if length < 3
  res = []
  nums.sort!

  (0..length-3).each do |i|
    next if (nums[i] == nums[i-1]) && (i > 0)

    (i+1..length-2).each do |j|
      l = j + 1
      k = length

      break if nums[i] + nums[j] + nums[l] + nums[l+1] > target
      next if nums[i] + nums[j] + nums[k-1] + nums[k] < target
      next if (nums[j] == nums[j-1]) && (j > i + 1)

      while l < k
        tmp = nums[i] + nums[j] + nums[k] + nums[l]

        if tmp == target
          res << [nums[i], nums[j], nums[k], nums[l]]
          l += 1
          k -= 1

          l += 1 while nums[l] == nums[l-1]
          k -= 1 while nums[k] == nums[k+1]
        elsif tmp > target
          k -= 1
        else
          l += 1
        end
      end
    end
  end

  res
end

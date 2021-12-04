def total_hamming_distance(nums)
  return 0 if nums.map! { |num| num.to_s(2).reverse }.length.zero?

  (0..nums.map(&:length).max).inject(0) do |d, i|
    p d, i
    ones = nums.count { |num| i < num.length && num[i] == '1' }
    p ones, '-----'
    d + ones * (nums.length - ones)
  end
end

nums = [4, 14, 2]
p total_hamming_distance(nums)

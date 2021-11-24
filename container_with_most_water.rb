def max_area(height)
  left = 0
  right = height.length - 1
  max = 0
  while left < right
    max = [[height[left], height[right]].min * (right - left), max].max
    height[left] > height[right] ? right -= 1 : left += 1
  end
  max
end

height = [1, 8, 6, 2, 5, 4, 8, 3, 7]

p max_area(height)

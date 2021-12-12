# https://leetcode.com/problems/pascals-triangle/

def generate(num_rows)
  res = []
  num_rows.times do |i|
    arr = Array.new(i + 1)
    arr.size.times do |j|
      if j == 0 || j == arr.size - 1
        arr[j] = 1
      else
        arr[j] = res[i - 1][j - 1] + res[i - 1][j]
      end
    end
    res << arr
  end
  res
end

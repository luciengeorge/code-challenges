def find_sum(arr, sum)
  start = 0
  stop = arr.size - 1
  while start < stop
    addition = arr[start] + arr[stop]
    return true if addition == sum

    addition > sum ? stop -= 1 : start += 1
  end
  false
end

puts '#find_sum'
p find_sum([1, 2, 3, 9], 8)
p find_sum([1, 2, 4, 4], 8)

def find_sum2(arr, sum)
  sums = {}
  arr.each do |el|
    sums[el] = sum - el
  end
  sums.each do |_el, target|
    return true if arr.include?(target)
  end
  false
end

puts '#find_sum2'
p find_sum2([1, 2, 3, 9], 8)
p find_sum2([1, 2, 4, 4], 8)

def find_sum_unsorted(arr, sum)
  compliments = Set.new
  arr.each do |el|
    compliment = sum - el
    return true if compliments.include?(compliment)

    compliments << compliment
  end
  false
end

puts '#find_sum_unsorted'
p find_sum2([3, 9, 2, 1], 8)
p find_sum2([4, 1, 2, 4], 8)

def merge_sort(array)
  return array if array.size <= 1

  mid = array.size / 2
  left = merge_sort(array[...mid])
  right = merge_sort(array[mid..])

  merge(left, right)
end

def merge(left, right)
  sorted = []
  while left.any? || right.any?
    if left.first && right.first
      sorted.push(left.first < right.first ? left.shift : right.shift)
    elsif left.first
      sorted.push left.shift
    else
      sorted.push right.shift
    end
  end
  sorted
end

p merge_sort([4, 3, 2, 4, 5, 61, 3, 9])

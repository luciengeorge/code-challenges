def quick_sort(array, first = 0, last = array.size - 1)
  if first < last
    j = partition(array, first, last)
    quick_sort(array, first, j - 1)
    quick_sort(array, j + 1, last)
  end
  array
end

def partition(array, first, last)
  p array
  pivot = array[last]
  partition_index = first
  i = first
  while i < last
    if array[i] <= pivot
      array[i], array[partition_index] = array[partition_index], array[i]
      partition_index += 1
    end
    i += 1
  end
  array[partition_index], array[last] = array[last], array[partition_index]
  partition_index
end

array = [4, 2, 1, 3]
p quick_sort(array)

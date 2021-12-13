def heapify(array)
  size = array.size / 2 - 1
  size.downto(0) do |index|
    order(array, index)
  end
end

def left(array, index)
  array[left_index(index)]
end

def left_index(index)
  index * 2 + 1
end

def right(array, index)
  array[right_index(index)]
end

def right_index(index)
  index * 2 + 2
end

def leaf?(array, index)
  index >= array.size / 2
end

def in_place?(array, index)
  array[index] >= left(array, index) && array[index] >= right(array, index)
end

def order(array, index)
  return if leaf?(array, index) || in_place?(array, index)

  left = left(array, index)
  right = right(array, index)

  larger_child_index = left > right ? left_index(index) : right_index(index)

  array[index], array[larger_child_index] = array[larger_child_index], array[index]
  order(array, larger_child_index)
end

array = (0..10).to_a
heapify(array)
p array

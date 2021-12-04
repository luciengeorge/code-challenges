def total_fruit(tree)
  i = 0
  max = 1
  h = {}

  tree.each_with_index do |val, index|
    h[val] = index
    if h.length > 2
      min_idx = h.values.min
      i = min_idx + 1
      fruit_to_remove = h.key(min_idx)
      h.delete(fruit_to_remove)
    end
    max = [max, index - i + 1].max
  end
  max
end

fruits = [3, 3, 3, 1, 2, 3, 3, 3]
p total_fruit(fruits)

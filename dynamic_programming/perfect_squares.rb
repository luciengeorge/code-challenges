def get_all_perfect_squares(num, squares, min_to_num)
  i = 1
  while i * i <= num
    squares << (i * i)
    min_to_num[i * i] = 1
    i += 1
  end
end

def min_num_squares(num, squares, min_to_num)
  return min_to_num[num] if min_to_num.key?(num)

  mins = []
  squares.each do |square|
    break if square > num

    mins << (num / square) + min_num_squares(num % square, squares, min_to_num)
  end

  min_to_num[num] = mins.min
  min_to_num[num]
end

def num_squares(num)
  squares = []
  min_to_num = { 0 => 0 }
  get_all_perfect_squares(num, squares, min_to_num)
  min_num_squares(num, squares, min_to_num)
end

puts num_squares(50)

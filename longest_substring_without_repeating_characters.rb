# https://leetcode.com/problems/longest-substring-without-repeating-characters/

def length_of_longest_substring(s)
  highest_count = 0
  queue = []
  s.each_char do |char|
    index = queue.index(char)
    queue.push(char)

    (index + 1).times { queue.shift } if index
    highest_count = [highest_count, queue.size].max
  end
  highest_count
end

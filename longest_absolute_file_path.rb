# https://leetcode.com/problems/longest-absolute-file-path/

def length_longest_path(input)
  length_by_levels = { -1 => 0 }
  max_length = 0
  input.split("\n").each do |line|
    level = line.count("\t")
    line_length = line.size - level
    if line.match?(/\./)
      max_length = [max_length, length_by_levels[level - 1] + line_length].max
    else
      length_by_levels[level] = length_by_levels[level - 1] + line_length + 1
    end
  end
  max_length
end

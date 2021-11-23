# https://leetcode.com/problems/string-to-integer-atoi/

def my_atoi(s)
  max = 2147483647
  min = -2147483648

  data = nil
  str = s.strip
  str.each_char do |c|
    is_sign_or_num = c.match?(/[+\-\d]/)
    if is_sign_or_num
      data = data.nil? ? c : "#{data}#{c}"
    else
      data = 0 if data.nil?
      break
    end
  end

  data = data.to_i
  if data > max
    max
  elsif data < min
    min
  else
    data
  end
end

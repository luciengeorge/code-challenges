# https://leetcode.com/problems/reverse-integer/

def reverse(x)
  if x < 0
    res = -x.to_s[1..-1].chars.reverse.join('').to_i
  else
    res = x.to_s.chars.reverse.join('').to_i
  end
  res < -2 ** 31 || res > 2 ** 31 - 1 ? 0 : res
end

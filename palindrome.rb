# https://leetcode.com/problems/palindrome-number/

def palindrome?(x)
  x.to_s.chars == x.to_s.chars.reverse
end

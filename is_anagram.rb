# https://leetcode.com/problems/valid-anagram/

def anagram?(s, t)
  s.chars.sort == t.chars.sort
end

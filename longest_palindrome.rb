# https://leetcode.com/problems/longest-palindromic-substring/

def longest_palindrome(s)
  return "" if s.empty?

  head, tail = 0, 0

  i = 0
  while i < s.size
    len1 = find_palindrome(s, i, i)
    len2 = find_palindrome(s, i, i + 1)
    len = [len1, len2].max
    if tail - head < len
      head = i - (len - 1) / 2
      tail = i + len / 2
    end

    i += 1
  end

  s[head..tail]
end

def find_palindrome(s, left, right)
  l, r = left, right
  while 0 <= l && r < s.size && s[l] == s[r]
    l -= 1
    r += 1
  end
  r - l - 1
end

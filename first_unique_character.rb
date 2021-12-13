=begin
Given a string s, find the first non-repeating character in it and return its index. If it does not exist, return -1.

Example 1:

Input: s = "leetcode"
Output: 0

Example 2:

Input: s = "loveleetcode"
Output: 2

Example 3:

Input: s = "aabb"
Output: -1

Constraints:
  1 <= s.length <= 105
  s consists of only lowercase English letters.
=end

def first_uniq_char(s)
  chars = {}

  s.chars.each_with_index do |char, index|
    chars[char] ||= 0
    chars[char] += 1
  end
  char = chars.key(1)
  char ? s.chars.find_index(char) : -1
end

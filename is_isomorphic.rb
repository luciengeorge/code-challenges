=begin
Given two strings s and t, determine if they are isomorphic.
Two strings s and t are isomorphic if the characters in s can be replaced to get t.
All occurrences of a character must be replaced with another character while preserving the order of characters. No two characters may map to the same character, but a character may map to itself.

Example 1:

Input: s = "egg", t = "add"
Output: true

Example 2:

Input: s = "foo", t = "bar"
Output: false

Example 3:

Input: s = "paper", t = "title"
Output: true

Constraints:

  1 <= s.length <= 5 * 104
  t.length == s.length
  s and t consist of any valid ascii character.
=end

# @param {String} s
# @param {String} t
# @return {Boolean}
def isomorphic?(s, t)
  maps = {}
  s.chars.each_with_index do |char, index|
    return false if maps.key?(char) && maps[char] != t[index] || maps.value?(t[index]) && maps.key(t[index]) != char

    maps[char] = t[index]
  end
  return true
end

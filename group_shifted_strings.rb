=begin
We can shift a string by shifting each of its letters to its successive letter.
  - For example, "abc" can be shifted to be "bcd".

We can keep shifting the string to form a sequence.
  - For example, we can keep shifting "abc" to form the sequence: "abc" -> "bcd" -> ... -> "xyz".

Given an array of strings strings, group all strings[i] that belong to the same shifting sequence. You may return the answer in any order.

Example 1:

Input: strings = ["abc","bcd","acef","xyz","az","ba","a","z"]
Output: [["acef"],["a","z"],["abc","bcd","xyz"],["az","ba"]]

Example 2:

Input: strings = ["a"]
Output: [["a"]]

Constraints:

  1 <= strings.length <= 200
  1 <= strings[i].length <= 50
  strings[i] consists of lowercase English letters.

=end

def find_origin(str)
  return '' if str.empty?

  shift = str[0].ord - 'a'.ord
  str.chars.map do |char|
    origin = char.ord - shift
    origin += 26 if origin < 'a'.ord
    origin.chr
  end.join('')
end

# @param {String[]} strings
# @return {String[][]}
def group_strings(strings)
  groups = Hash.new([])
  strings.each do |str|
    origin = find_origin(str)
    groups[origin] += [str]
  end
  groups.values
end

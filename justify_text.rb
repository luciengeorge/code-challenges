=begin
Given an array of strings words and a width maxWidth, format the text such that each line has exactly maxWidth characters and is fully (left and right) justified.
You should pack your words in a greedy approach; that is, pack as many words as you can in each line. Pad extra spaces ' ' when necessary so that each line has exactly maxWidth characters.
Extra spaces between words should be distributed as evenly as possible. If the number of spaces on a line does not divide evenly between words, the empty slots on the left will be assigned more spaces than the slots on the right.
For the last line of text, it should be left-justified and no extra space is inserted between words.
Note:
  A word is defined as a character sequence consisting of non-space characters only.
  Each word's length is guaranteed to be greater than 0 and not exceed maxWidth.
  The input array words contains at least one word.

Example 1:

Input: words = ["This", "is", "an", "example", "of", "text", "justification."], maxWidth = 16
Output:
[
 "This    is    an",
 "example  of text",
 "justification.  "
]

Example 2:

Input: words = ["What","must","be","acknowledgment","shall","be"], maxWidth = 16
Output:
[
  "What   must   be",
  "acknowledgment  ",
  "shall be        "
]
Explanation: Note that the last line is "shall be    " instead of "shall     be", because the last line must be left-justified instead of fully-justified.
Note that the second line is also left-justified becase it contains only one word.

Example 3:

Input: words = ["Science","is","what","we","understand","well","enough","to","explain","to","a","computer.","Art","is","everything","else","we","do"], maxWidth = 20
Output:
[
  "Science  is  what we",
  "understand      well",
  "enough to explain to",
  "a  computer.  Art is",
  "everything  else  we",
  "do                  "
]

Constraints:
  1 <= words.length <= 300
  1 <= words[i].length <= 20
  words[i] consists of only English letters and symbols.
  1 <= maxWidth <= 100
  words[i].length <= maxWidth
=end

# @param {String[]} words
# @param {Integer} max_width
# @return {String[]}
def full_justify(words, max_width)
  justified_text = []
  line = []
  length = 0
  words.each do |word|
    if length + word.size > max_width
      justified_text.push(full_justified_text(line, max_width))
      line = []
      length = 0
    end
    line.push(word)
    length += word.size + 1
  end
  justified_text.push(left_justified_text(line, max_width))
  justified_text
end

def left_justified_text(line, max_width)
  result = ""
  line[0...-1].each do |word|
    result += "#{word} "
  end
  result += line[-1]
  right_spaces = max_width - result.size
  result += " " * right_spaces
  result
end

def full_justified_text(line, max_width)
  return left_justified_text(line, max_width) if line.size == 1

  gaps = line.length - 1
  chars = line.sum(&:size)
  spaces = max_width - chars
  even_spaces = spaces / gaps
  odd_spaces = spaces % gaps

  result = ''
  line[0...-1].each do |word|
    result += word
    result += ' ' * even_spaces
    next if odd_spaces.zero?

    result += ' '
    odd_spaces -= 1
  end
  result += line[-1]
  result
end

# https://leetcode.com/problems/decode-string/

def decode_string(s)
  stack = []
  started = false
  s.chars.each do |char|
    if char == ']'
      temp = ''
      temp = stack.pop + temp until stack.last == '['
      stack.pop
      multiplicator = ''
      multiplicator = stack.pop + multiplicator while stack.last&.match?(/\d/)
      stack.push(temp * multiplicator.to_i)
    else
      stack.push(char)
    end
  end
  stack.join
end

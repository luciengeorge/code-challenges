# https://leetcode.com/problems/valid-parentheses/

def is_valid(s)
  brackets = {
    '(' => ')',
    '{' => '}',
    '[' => ']'
  }

  stack = []
  s.chars.each do |c|
    if brackets[stack.last] == c
      stack.pop
    else
      stack.push(c)
    end
  end
  stack.empty?
end

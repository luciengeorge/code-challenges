def eval_rpn(tokens)
  stack = []
  tokens.each do |token|
    if token.match?(/\d+/)
      stack.push(token)
    else
      second = stack.pop.to_i
      first = stack.pop.to_i
      result = evaluate(first, second, token)
      stack.push(result)
    end
    p stack
  end
  stack.last.to_i
end

def evaluate(first, second, token)
  case token
  when '+'
    first + second
  when '-'
    first - second
  when '/'
    first.fdiv(second).truncate
  when '*'
    first * second
  end
end

tokens = ['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']
p eval_rpn(tokens)

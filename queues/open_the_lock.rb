# https://leetcode.com/problems/open-the-lock/

def open_lock(deadends, target)
  deadends = Set.new(deadends)
  visited = Set.new(['0000'])
  changes = 0
  return 0 if target == '0000'
  return -1 if deadends.include? '0000'

  queue = ['0000']

  until queue.empty?
    changes += 1
    queue.size.times do |i|
      current = queue.shift
      4.times do |j|
        upper_code = find_code(current, j, :upper)
        lower_code = find_code(current, j, :lower)
        return changes if [upper_code, lower_code].include?(target)

        if !deadends.include?(upper_code) && !visited.include?(upper_code)
          queue.push(upper_code)
          visited.add(upper_code)
        end

        if !deadends.include?(lower_code) && !visited.include?(lower_code)
          queue.push(lower_code)
          visited.add(lower_code)
        end
      end
    end
  end
  -1
end

def find_code(current, pos, direction)
  code = current.dup
  case direction
  when :upper
    code[pos] = ((code[pos].to_i + 1) % 10).to_s
  when :lower
    code[pos] = ((code[pos].to_i - 1) % 10).to_s
  end
  code
end

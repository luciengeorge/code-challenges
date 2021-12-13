require 'set'

def alien_order(words)
  return '' if words.nil? || words.empty?

  map = {}
  degrees = {}
  result = ''

  words.each do |word|
    word.each_char do |char|
      degrees[char] = 0
    end
  end

  0.upto(words.length - 2).each do |i|
    word1 = words[i]
    word2 = words[i + 1]
    next if word1 == word2

    return '' if word1.start_with?(word2)

    size = [word1.size, word2.size].min

    size.times do |j|
      c1 = word1[j]
      c2 = word2[j]
      next if c1 == c2

      map[c1] ||= Set.new
      unless map[c1].include?(c2)
        map[c1].add(c2)
        degrees[c2] += 1
      end
      break
    end
  end

  queue = degrees.select { |c, degrees| degrees.zero? }.keys

  while queue.any?
    curr = queue.shift
    result += curr
    if map[curr]
      map[curr].each do |c|
        degrees[c] -= 1
        queue.push(c) if degrees[c].zero?
      end
    end
  end

  return '' unless result.size == degrees.size

  result
end

words = %w[wrt wrf er ett rftt]
# words = %w[z x z]

p alien_order(words)

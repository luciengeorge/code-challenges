# https://leetcode.com/problems/top-k-frequent-words/

def top_k_frequent(words, k)
  frequency  = Hash.new(0)
  words.each do |word|
    frequency[word] += 1
  end

  most_frequent_values = frequency.values.sort.last(k)
  frequency.select { |k, v| most_frequent_values.include? v }
           .sort_by { |k, v| [-v, k] }
           .map(&:first)
           .first(k)
end

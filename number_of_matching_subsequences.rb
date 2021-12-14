def num_matching_subseq(s, words)
  count = 0
  words.each do |word|
    sub = true
    ptr = 0
    offset = 0
    word.size.times do |i|
      ptr = s[offset..].index(word[i])
      if ptr.nil?
        sub = false
        break
      else
        offset += 1 + ptr
      end
    end
    count += 1 if sub
  end
  count
end

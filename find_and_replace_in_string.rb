def find_replace_string(s, indexes, sources, targets)
  ans = ''
  i = 0
  index_hash = {}
  indexes.each_with_index do |index, j|
    index_hash[index] = j
  end

  while i < s.length
    if index_hash[i].nil?
      ans += s[i]
      i += 1
      next
    end

    j = index_hash[i]
    index = indexes[j]
    source = sources[j]
    target = targets[j]

    if s[index...(index + source.length)] != source
      ans += s[i]
      i += 1
    else
      ans += target
      i += source.length
    end
  end

  ans
end

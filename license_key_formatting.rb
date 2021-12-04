# https://leetcode.com/explore/interview/card/google/67/sql-2/472/

def license_key_formatting(s, k)
  s = s.upcase.delete('-')
  temp = 1
  (s.size - 1).downto(1).each do |i|
    if temp == k
      s.insert(i, '-')
      temp = 0
    end
    temp += 1
  end
  s
end

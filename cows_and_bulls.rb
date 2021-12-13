# https://leetcode.com/problems/bulls-and-cows/

def get_hint(secret, guess)
  size = secret.size
  bulls = 0
  cows = 0
  s_arr = []
  g_arr = []

  size.times do |i|
    if secret[i] == guess[i]
      bulls += 1
    else
      s_arr << secret[i]
      g_arr << guess[i]
    end
  end

  g_arr.each do |char|
    s_index = s_arr.index(char)
    next unless s_index

    cows += 1
    s_arr.delete_at(s_index)
  end

  "#{bulls}A#{cows}B"
end

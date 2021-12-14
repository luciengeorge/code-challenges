# https://leetcode.com/problems/sentence-screen-fitting/

# def words_typing(sentence, rows, cols)
#   words = "#{sentence.join(' ')} "
#   length = words.length
#   count = 0
#   rows.times do
#     count += cols
#     count -= 1 until words[count % length] == ' '
#     count += 1
#   end
#   count / length
# end

# Explanation
# We want to know how many times the given sentence can be fitted, we are actually looking
# for the maximum time the given sentence can be fitted. Hence, what we'll try to do is fit
# as many words as possible on each line. So, here, we are trying to put as many words as
# possible on one row and trim the trailing word (i.e. word that doesn't fit on the row)
# We can ignore the spaces added because they are not part of the sentence anw.
# Since the trailing word didn't fit on the previous row, we travel back to the beginning of
# the word (i.e. reducing the count) and start again on the next row.
# Because we need a space between each word we join `sentence` with a space and add a space
# at the end because each full sentence needs to be separated by a space as well.
# Then we consider each row sequentially. `count` represents the number of characters
# we have added to the row. For each row we start by adding the maximum of `cols` characters
# into the row by starting at the `count` index. Then we check if the `count` is on a space
# or a character. If it is on a character it means that we cannot fit the word and we need to
# travel back to the previous space (the values in `map` is how much we have to travel back).
# if it is on a space we can add 1 to `count` to take into account this explicit space.
# At the end `count` represents the total number of characters from `words` that we managed
# to fit. So we can divide that number by the size of `words` to see how many times `words`
# was fitted
def words_typing(sentence, rows, cols)
  words = "#{sentence.join(' ')} "
  length = words.length
  count = 0
  map = []
  1.upto(length - 1) do |i|
    # represents the numbers of times we have to travel back to the previous space
    map[i] = s[i] == ' ' ? 1 : map[i - 1] - 1
  end
  rows.times do
    # add the number of cols initially
    count += cols
    # checks if we're on a character or a space and either adds 1 if space, or travels back to previous space
    count += map[count % length]
  end
  # divide the number of fitted characters by the length of `words`
  count / length
end

sentence = %w[hello world]
rows = 2
cols = 8
p words_typing(sentence, rows, cols)

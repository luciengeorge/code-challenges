# https://leetcode.com/problems/ransom-note/

# def can_construct(ransom_note, magazine)
#   ransom_note_chars = ransom_note.chars
#   magazine_chars = magazine.chars
#   ransom_note_chars.all? do |char|
#     magazine_chars.count(char) >= ransom_note_chars.count(char)
#   end
# end

def can_construct(ransom_note, magazine)
  notes = Hash.new(0)
  magazines = Hash.new(0)

  ransom_note.each_char do |char|
    notes[char] += 1
  end

  magazine.each_char do |char|
    magazines[char] += 1
  end

  notes.all? do |char, count|
    count <= magazines[char]
  end
end

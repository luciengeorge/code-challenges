# https://leetcode.com/problems/hand-of-straights/

def n_straight_hand?(hand, group_size)
  return false unless hand.size % group_size == 0

  hand.sort!

  @valid = true
  check_valid(hand, group_size)
  @valid
end

def check_valid(hand, group_size)
  p hand
  current_hand = []
  index = 0

  while current_hand.size < group_size && index < hand.size
    if current_hand.empty? || current_hand.last + 1 == hand[index]
      current_hand << hand.delete_at(index)
    else
      index += 1
    end
  end

  p current_hand

  @valid = false unless current_hand.size == group_size
  return unless @valid

  check_valid(hand, group_size) if hand.any?
end

hand = [1, 2, 3, 6, 2, 3, 4, 7, 8]
group_size = 3
p n_straight_hand?(hand, group_size)

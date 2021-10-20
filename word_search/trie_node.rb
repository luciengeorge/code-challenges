class TrieNode
  attr_accessor :next, :word

  def initialize
    @next = Array.new(26)
    @word = nil
  end
end

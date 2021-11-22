class Node
  attr_accessor :val, :neighbors

  def initialize(val = 0, neighbors = [])
    @val = val
    @neighbors = neighbors
  end

  def add_edge(neighbor)
    @neighbors << neighbor
  end
end

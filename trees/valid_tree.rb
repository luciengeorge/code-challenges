# @param {Integer} n
# @param {Integer[][]} edges
# @return {Boolean}
def valid_tree(n, edges)
  return false unless edges.size == n - 1

  parents = Array.new(n) { |i| i }
  edges.each do |v1, v2|
    return false unless union(parents, v1, v2)
  end

  true
end

def union(parents, v1, v2)
  p1 = find(v1, parents)
  p2 = find(v2, parents)
  return false if p1 == p2

  parents[p2] = p1
  p1 != p2
end

def find(v, parents)
  parents[v] = find(parents[v], parents) if parents[v] != v
  parents[v]
end

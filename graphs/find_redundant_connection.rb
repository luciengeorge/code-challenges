# https://leetcode.com/problems/redundant-connection/

def find_redundant_connection(edges)
  parent = {}
  edges.each do |v1, v2|
    return [v1, v2] unless union(v1, v2, parent)
  end
  []
end

def find(v, parent)
  p "#{parent}, #{parent[v] || 'nil'}, #{v}"
  parent[v] = v if parent[v].nil?
  parent[v] = find(parent[v], parent) if parent[v] != v
  parent[v]
end

def union(v1, v2, parent)
  p1 = find(v1, parent)
  p2 = find(v2, parent)
  parent[p2] = p1
  p1 != p2 # Return true if the vertices are in different set, else false
end

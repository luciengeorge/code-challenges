# https://leetcode.com/problems/clone-graph/submissions/

require_relative 'node'

def clone_graph(node)
  return nil unless node

  queue = [node]
  cloned = { node => Node.new(node.val, []) }

  until queue.empty?
    current_node = queue.shift

    current_node.neighbors.each do |neighbor|
      if cloned[neighbor].nil?
        cloned[neighbor] = Node.new(neighbor.val, [])
        queue.push(neighbor)
      end

      cloned[current_node].neighbors.push(cloned[neighbor])
    end
  end
  cloned[node]
end

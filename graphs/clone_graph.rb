# https://leetcode.com/problems/clone-graph/submissions/

require_relative 'node'

def clone_graph(node)
  return nil unless node

  queue = [node]
  visited = { node => Node.new(node.val, []) }

  until queue.empty?
    current_node = queue.shift

    current_node.neighbors.each do |neighbor|
      if visited[neighbor].nil?
        visited[neighbor] = Node.new(neighbor.val, [])
        queue.push(neighbor)
      end

      visited[current_node].neighbors.push(visited[neighbor])
    end
  end
  visited[node]
end

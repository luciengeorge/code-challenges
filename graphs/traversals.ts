import Node from './node'

function bfs(root: Node, target: number) {
  const visited = new Set<Node>()
  const queue: Node[] = [root]

  while (queue.length > 0) {
    const current = queue.shift()
    if (current?.val === target) {
      return true
    }

    current?.neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        queue.push(neighbor)
      }
    })
  }
  return false
}

function dfs(root: Node, target: number) {
  const visited = new Set<Node>()
  const stack = [root]

  while (stack.length > 0) {
    const current = stack.pop()
    if (current?.val === target) {
      return true
    }

    current?.neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        stack.unshift(neighbor)
      }
    })
  }
  return false
}

const root = new Node(3)
const node1 = new Node(4)
const node2 = new Node(5)
const node3 = new Node(2)
const node4 = new Node(10)
const node5 = new Node(1)

root.neighbors.push(node1, node2)
node1.neighbors.push(root, node2)
node2.neighbors.push(root, node1, node3)
node3.neighbors.push(node2, node4, node5)
node4.neighbors.push(node3)
node5.neighbors.push(node3)

console.log(bfs(root, 10))
console.log(dfs(root, 10))

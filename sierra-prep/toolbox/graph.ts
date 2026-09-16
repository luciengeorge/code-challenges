import { check, suite } from '../lib/check'

type Adjacency = Map<string, string[]>

// Time and space O(V + E), including an empty list for destination-only nodes.
export function buildAdjacency(
  edges: [string, string][],
  { directed }: { directed: boolean }
): Adjacency {
  const adj: Adjacency = new Map()
  for (const [from, to] of edges) {
    if (!adj.has(from)) adj.set(from, [])
    if (!adj.has(to)) adj.set(to, [])
    adj.get(from)!.push(to)
    if (!directed) adj.get(to)!.push(from)
  }
  return adj
}

// Time O(V + E), space O(V). BFS gives shortest paths when every edge costs one.
export function bfsShortestPath(adj: Adjacency, start: string, goal: string): string[] | null {
  const queue = [start]
  const parent = new Map<string, string | null>([[start, null]])

  // A head index avoids the O(n) movement caused by Array.shift().
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head]
    if (node === goal) {
      const path: string[] = []
      for (let current: string | null = goal; current !== null; current = parent.get(current)!) {
        path.push(current)
      }
      return path.reverse()
    }
    for (const next of adj.get(node) ?? []) {
      if (parent.has(next)) continue
      parent.set(next, node)
      queue.push(next)
    }
  }
  return null
}

// Time and space O(V + E): pending stack entries may repeat until visited.
export function dfsIterative(adj: Adjacency, start: string): string[] {
  // An explicit stack avoids recursion depth limits on long dependency chains.
  const stack = [start]
  const visited = new Set<string>()
  const order: string[] = []
  while (stack.length > 0) {
    const node = stack.pop()!
    if (visited.has(node)) continue
    visited.add(node)
    order.push(node)
    const neighbours = adj.get(node) ?? []
    // Reverse pushes preserve the adjacency list's traversal order.
    for (let i = neighbours.length - 1; i >= 0; i--) {
      if (!visited.has(neighbours[i])) stack.push(neighbours[i])
    }
  }
  return order
}

// Time O(V + E), space O(V), using Kahn's algorithm in topoLevels.
export function topoSort(adj: Adjacency, nodes: string[]): string[] | null {
  const levels = topoLevels(adj, nodes)
  return levels === null ? null : levels.flat()
}

// Time O(V + E), space O(V). Edges mean prerequisite -> dependent step.
export function topoLevels(adj: Adjacency, nodes: string[]): string[][] | null {
  const indegree = new Map(nodes.map(node => [node, 0]))
  // Include edge endpoints as well as explicitly supplied isolated nodes.
  for (const [from, neighbours] of adj) {
    if (!indegree.has(from)) indegree.set(from, 0)
    for (const to of neighbours) indegree.set(to, (indegree.get(to) ?? 0) + 1)
  }
  let ready = [...indegree.keys()].filter(node => indegree.get(node) === 0)
  const levels: string[][] = []
  let processed = 0
  while (ready.length > 0) {
    const batch = ready
    ready = []
    levels.push(batch)
    processed += batch.length
    // Newly ready nodes belong to the next batch, after this batch finishes.
    for (const node of batch) {
      for (const next of adj.get(node) ?? []) {
        const remaining = indegree.get(next)! - 1
        indegree.set(next, remaining)
        if (remaining === 0) ready.push(next)
      }
    }
  }
  return processed === indegree.size ? levels : null
}

// Time O(V + E), space O(V), including the recursive call stack.
export function findCycle(adj: Adjacency, nodes: string[]): string[] | null {
  // Missing = white, 1 = grey (on the active path), 2 = black (finished).
  const colour = new Map<string, 1 | 2>()
  const path: string[] = []

  // For very deep graphs, replace recursive calls with explicit stack frames.
  function visit(node: string): string[] | null {
    colour.set(node, 1)
    path.push(node)
    for (const next of adj.get(node) ?? []) {
      if (colour.get(next) === 1) return [...path.slice(path.indexOf(next)), next]
      if (!colour.has(next)) {
        const cycle = visit(next)
        if (cycle !== null) return cycle
      }
    }
    path.pop()
    colour.set(node, 2)
    return null
  }

  for (const node of new Set([...nodes, ...adj.keys()])) {
    if (colour.has(node)) continue
    const cycle = visit(node)
    if (cycle !== null) return cycle
  }
  return null
}

suite('graph', () => {
  const nodes = ['authenticate', 'fetch-account', 'fetch-orders', 'compose-reply', 'send-reply']
  const adj = buildAdjacency([
    ['authenticate', 'fetch-account'],
    ['authenticate', 'fetch-orders'],
    ['fetch-account', 'compose-reply'],
    ['fetch-orders', 'compose-reply'],
    ['compose-reply', 'send-reply']
  ], { directed: true })

  check('destination nodes have a list', adj.get('send-reply'), [])
  check('shortest path', bfsShortestPath(adj, 'authenticate', 'send-reply'), [
    'authenticate', 'fetch-account', 'compose-reply', 'send-reply'
  ])
  check('path to self', bfsShortestPath(adj, 'authenticate', 'authenticate'), ['authenticate'])
  check('no reverse path in a directed graph', bfsShortestPath(adj, 'send-reply', 'authenticate'), null)
  check('iterative depth-first order', dfsIterative(adj, 'authenticate'), [
    'authenticate', 'fetch-account', 'compose-reply', 'send-reply', 'fetch-orders'
  ])
  check('dependency order', topoSort(adj, nodes), nodes)
  check('steps that can run in parallel', topoLevels(adj, nodes), [
    ['authenticate'], ['fetch-account', 'fetch-orders'], ['compose-reply'], ['send-reply']
  ])
  check('shared dependency is not a cycle', findCycle(adj, nodes), null)

  const cyclic = buildAdjacency([
    ['start', 'fetch-account'],
    ['fetch-account', 'check-policy'],
    ['check-policy', 'fetch-account']
  ], { directed: true })
  check('cycle prevents sorting', topoSort(cyclic, ['start']), null)
  check('cycle prevents batching', topoLevels(cyclic, ['start']), null)
  check('actual cycle excludes the lead-in', findCycle(cyclic, ['start']), [
    'fetch-account', 'check-policy', 'fetch-account'
  ])
  check('BFS terminates on a cycle', bfsShortestPath(cyclic, 'start', 'missing'), null)
  check('DFS visits cyclic nodes once', dfsIterative(cyclic, 'start'), ['start', 'fetch-account', 'check-policy'])

  const disconnected = buildAdjacency([
    ['load-account', 'draft-response'], ['load-policy', 'check-policy']
  ], { directed: true })
  const allNodes = ['load-account', 'load-policy', 'archive', 'draft-response', 'check-policy']
  check('disconnected path', bfsShortestPath(disconnected, 'load-account', 'check-policy'), null)
  check('isolated start', dfsIterative(disconnected, 'archive'), ['archive'])
  check('disconnected batches include isolated nodes', topoLevels(disconnected, allNodes), [
    ['load-account', 'load-policy', 'archive'], ['draft-response', 'check-policy']
  ])
  check('disconnected sort', topoSort(disconnected, allNodes), allNodes)
  check('disconnected acyclic graph', findCycle(disconnected, allNodes), null)

  const selfLoop = buildAdjacency([['retry', 'retry']], { directed: true })
  check('self-loop', findCycle(selfLoop, ['idle']), ['retry', 'retry'])
  check('cycle in another component', findCycle(new Map([...disconnected, ...selfLoop]), allNodes), ['retry', 'retry'])
  check('self-loop cannot be scheduled', topoSort(selfLoop, []), null)

  const undirected = buildAdjacency([['agent', 'customer'], ['customer', 'article']], { directed: false })
  check('undirected reverse path', bfsShortestPath(undirected, 'article', 'agent'), ['article', 'customer', 'agent'])
  check('undirected neighbours', undirected.get('customer'), ['agent', 'article'])
  check('destination-only node in supplied map', topoSort(new Map([['a', ['b']]]), ['a']), ['a', 'b'])
  check('empty sort', topoSort(new Map(), []), [])
  check('empty batches', topoLevels(new Map(), []), [])
  check('empty graph has no cycle', findCycle(new Map(), []), null)
})

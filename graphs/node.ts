class Node {
  val: number
  neighbors: Node[]

  constructor(val: number, neighbors: Node[] = []) {
    this.val = val
    this.neighbors = neighbors
  }
}

export default Node

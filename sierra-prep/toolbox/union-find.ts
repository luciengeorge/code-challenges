import { check, checkThrows, suite } from '../lib/check'

// Time: construct n singleton sets in O(n); space: O(n) for parents and sizes.
export class UnionFind {
  private parents: number[]
  private sizes: number[]
  private groups: number

  constructor(n: number) {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('size must be a nonnegative integer')

    this.parents = Array.from({ length: n }, (_, i) => i)
    this.sizes = Array.from({ length: n }, () => 1)
    this.groups = n
  }

  find(id: number): number {
    this.assertId(id)
    if (this.parents[id] !== id) {
      this.parents[id] = this.find(this.parents[id])
    }
    return this.parents[id]
  }

  union(a: number, b: number): boolean {
    let rootA = this.find(a)
    let rootB = this.find(b)
    if (rootA === rootB) return false

    if (this.sizes[rootA] < this.sizes[rootB]) {
      const tmp = rootA
      rootA = rootB
      rootB = tmp
    }

    this.parents[rootB] = rootA
    this.sizes[rootA] += this.sizes[rootB]
    this.groups--
    return true
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b)
  }

  joined(a: number, b: number): boolean {
    return this.connected(a, b)
  }

  count(): number {
    return this.groups
  }

  sizeOf(id: number): number {
    return this.sizes[this.find(id)]
  }

  private assertId(id: number): void {
    if (!Number.isInteger(id) || id < 0 || id >= this.parents.length) {
      throw new RangeError('id out of range')
    }
  }
}

// Time: O((n + p) alpha(n)) for n items and p pairs; space: O(n) for grouping.
export function groupBySameness<T>(items: T[], pairs: [number, number][]): T[][] {
  const uf = new UnionFind(items.length)
  for (const [a, b] of pairs) uf.union(a, b)

  const groups = new Map<number, T[]>()
  for (let i = 0; i < items.length; i++) {
    const root = uf.find(i)
    const group = groups.get(root)
    if (group) group.push(items[i])
    else groups.set(root, [items[i]])
  }
  return [...groups.values()]
}

suite('union find', () => {
  const uf = new UnionFind(5)
  check('starts disconnected', [uf.count(), uf.connected(0, 1), uf.sizeOf(0)], [5, false, 1])
  check('joined after union', [uf.union(0, 1), uf.joined(0, 1), uf.count(), uf.sizeOf(0)], [true, true, 4, 2])
  check('union returns false when already joined', uf.union(1, 0), false)
  uf.union(1, 2)
  check('transitive connected', [uf.connected(0, 2), uf.sizeOf(2), uf.count()], [true, 3, 3])
  check('still disconnected', uf.connected(3, 4), false)
  checkThrows('invalid id throws', () => uf.find(5), 'out of range')

  check('groups deterministic by first index', groupBySameness(['a', 'b', 'c', 'd', 'e'], [[2, 4], [1, 3]]), [
    ['a'],
    ['b', 'd'],
    ['c', 'e']
  ])
  check('empty groups', groupBySameness([], []), [])
  checkThrows('invalid pair throws', () => groupBySameness(['a'], [[0, 1]]), 'out of range')
})

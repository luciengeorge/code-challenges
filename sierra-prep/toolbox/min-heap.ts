import { check, checkThrows, suite } from '../lib/check'

type Comparator<T> = (a: T, b: T) => number

// Time: construct an empty heap in O(1); space: O(1) beyond stored items.
export class Heap<T> {
  private items: T[] = []

  constructor(private readonly cmp: Comparator<T>) {}

  size(): number {
    return this.items.length
  }

  peek(): T | undefined {
    return this.items[0]
  }

  push(item: T): void {
    this.items.push(item)
    this.siftUp(this.items.length - 1)
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined

    const root = this.items[0]
    const last = this.items.pop() as T
    if (this.items.length > 0) {
      this.items[0] = last
      this.siftDown(0)
    }
    return root
  }

  // Time: O(n) heap construction; space: O(n) copy so the input array is never mutated.
  static heapify<T>(items: T[], cmp: Comparator<T>): Heap<T> {
    const heap = new Heap(cmp)
    heap.items = items.slice()
    for (let i = (heap.items.length >> 1) - 1; i >= 0; i--) {
      heap.siftDown(i)
    }
    return heap
  }

  private siftUp(index: number): void {
    let child = index
    while (child > 0) {
      // Parent of child i is (i - 1) >> 1.
      const parent = (child - 1) >> 1
      if (this.cmp(this.items[parent], this.items[child]) <= 0) break
      this.swap(parent, child)
      child = parent
    }
  }

  private siftDown(index: number): void {
    let parent = index
    while (true) {
      // Children of parent i are 2 * i + 1 and 2 * i + 2.
      const left = 2 * parent + 1
      const right = left + 1
      let smallest = parent

      if (left < this.items.length && this.cmp(this.items[left], this.items[smallest]) < 0) {
        smallest = left
      }
      if (right < this.items.length && this.cmp(this.items[right], this.items[smallest]) < 0) {
        smallest = right
      }
      if (smallest === parent) break

      this.swap(parent, smallest)
      parent = smallest
    }
  }

  private swap(a: number, b: number): void {
    const tmp = this.items[a]
    this.items[a] = this.items[b]
    this.items[b] = tmp
  }
}

// Time: O(n log min(k, n)); space: O(min(k, n)) for the kept heap and result.
export function topK<T>(items: T[], k: number, cmp: Comparator<T>): T[] {
  if (k <= 0) return []
  if (!Number.isInteger(k)) throw new RangeError('k must be an integer')

  const limit = Math.min(k, items.length)
  const heap = new Heap(cmp)

  for (const item of items) {
    if (heap.size() < limit) {
      heap.push(item)
    } else if (limit > 0 && cmp(item, heap.peek() as T) > 0) {
      heap.pop()
      heap.push(item)
    }
  }

  const result: T[] = []
  while (heap.size() > 0) {
    result.push(heap.pop() as T)
  }
  return result.reverse()
}

suite('heap', () => {
  const numbers = new Heap<number>((a, b) => a - b)
  for (const value of [5, 1, 4, 3, 2]) numbers.push(value)
  check('min peek', numbers.peek(), 1)
  check('min pop order', [numbers.pop(), numbers.pop(), numbers.pop()], [1, 2, 3])

  const max = new Heap<number>((a, b) => b - a)
  for (const value of [5, 1, 4, 3, 2]) max.push(value)
  check('max comparator pop order', [max.pop(), max.pop(), max.pop()], [5, 4, 3])

  const tasks = new Heap<{ name: string, priority: number }>((a, b) => a.priority - b.priority)
  tasks.push({ name: 'low', priority: 5 })
  tasks.push({ name: 'high', priority: 1 })
  tasks.push({ name: 'middle', priority: 3 })
  check('objects use comparator', tasks.pop()?.name, 'high')

  const input = [9, 4, 7, 1, 3]
  const heapified = Heap.heapify(input, (a, b) => a - b)
  check('heapify does not mutate input', input, [9, 4, 7, 1, 3])
  check('heapify pop order', [heapified.pop(), heapified.pop(), heapified.pop()], [1, 3, 4])

  const people = [
    { name: 'Ada', score: 8 },
    { name: 'Grace', score: 10 },
    { name: 'Linus', score: 7 },
    { name: 'Edsger', score: 9 }
  ]
  check(
    'topK objects descending by comparator',
    topK(people, 2, (a, b) => a.score - b.score).map((person) => person.name),
    ['Grace', 'Edsger']
  )
  check('topK nonpositive', topK([1, 2, 3], 0, (a, b) => a - b), [])
  checkThrows('topK rejects fractional k', () => topK([1, 2, 3], 1.5, (a, b) => a - b), 'integer')

  const empty = new Heap<number>((a, b) => a - b)
  check('empty pop', empty.pop(), undefined)
})

import { check, checkThrows, suite } from '../lib/check'

type Link<T> = {
  value: T
  prev: Link<T> | null
  next: Link<T> | null
}

// Time: construct an empty deque in O(1); space: O(1) beyond stored nodes.
export class Deque<T> {
  private head: Link<T> | null = null
  private tail: Link<T> | null = null
  private length = 0

  size(): number {
    return this.length
  }

  peekFront(): T | undefined {
    return this.head?.value
  }

  peekBack(): T | undefined {
    return this.tail?.value
  }

  pushFront(value: T): void {
    const node = { value, prev: null, next: this.head }
    if (this.head) this.head.prev = node
    else this.tail = node
    this.head = node
    this.length++
  }

  pushBack(value: T): void {
    const node = { value, prev: this.tail, next: null }
    if (this.tail) this.tail.next = node
    else this.head = node
    this.tail = node
    this.length++
  }

  popFront(): T | undefined {
    if (!this.head) return undefined

    const value = this.head.value
    this.head = this.head.next
    if (this.head) this.head.prev = null
    else this.tail = null
    this.length--
    return value
  }

  popBack(): T | undefined {
    if (!this.tail) return undefined

    const value = this.tail.value
    this.tail = this.tail.prev
    if (this.tail) this.tail.next = null
    else this.head = null
    this.length--
    return value
  }
}

// Time: O(n) because each index enters and leaves once; space: O(k) for the monotonic deque.
export function slidingWindowMax(nums: number[], k: number): number[] {
  if (!Number.isInteger(k)) throw new RangeError('k must be an integer')
  if (k <= 0 || k > nums.length) return []

  const indices = new Deque<number>()
  const result: number[] = []

  for (let i = 0; i < nums.length; i++) {
    while (indices.peekFront() !== undefined && (indices.peekFront() as number) <= i - k) {
      indices.popFront()
    }

    while (
      indices.peekBack() !== undefined &&
      nums[indices.peekBack() as number] <= nums[i]
    ) {
      indices.popBack()
    }

    indices.pushBack(i)
    if (i >= k - 1) result.push(nums[indices.peekFront() as number])
  }

  return result
}

suite('deque', () => {
  const deque = new Deque<number>()
  check('empty pops', [deque.popFront(), deque.popBack(), deque.size()], [undefined, undefined, 0])

  deque.pushBack(2)
  deque.pushFront(1)
  deque.pushBack(3)
  check('mixed end peeks', [deque.peekFront(), deque.peekBack(), deque.size()], [1, 3, 3])
  check('mixed end pops', [deque.popFront(), deque.popBack(), deque.popFront()], [1, 3, 2])
  check('empty after mixed pops', [deque.popFront(), deque.size()], [undefined, 0])

  deque.pushFront(10)
  check('singleton reuse front', [deque.peekFront(), deque.peekBack(), deque.popBack()], [10, 10, 10])
  deque.pushBack(20)
  check('singleton reuse back', [deque.peekFront(), deque.peekBack(), deque.popFront()], [20, 20, 20])

  check('standard sliding max', slidingWindowMax([1, 3, -1, -3, 5, 3, 6, 7], 3), [3, 3, 5, 5, 6, 7])
  check('window size one', slidingWindowMax([4, 2, 12], 1), [4, 2, 12])
  check('whole array window', slidingWindowMax([4, 2, 12], 3), [12])
  check('duplicates', slidingWindowMax([2, 2, 2, 1, 2], 2), [2, 2, 2, 2])
  check('invalid impossible windows', [slidingWindowMax([1, 2], 0), slidingWindowMax([1, 2], 3)], [[], []])
  checkThrows('rejects fractional k', () => slidingWindowMax([1, 2, 3], 1.5), 'integer')
})

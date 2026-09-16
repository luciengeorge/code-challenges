import { check, suite } from '../lib/check'

// Time O(log n), space O(1). First index whose value is >= target.
export function lowerBound(arr: readonly number[], target: number): number {
  return lowerBoundBy(arr, value => (value < target ? -1 : value > target ? 1 : 0))
}

// Time O(log n), space O(1). First index whose value is > target.
export function upperBound(arr: readonly number[], target: number): number {
  return lowerBoundBy(arr, value => (value <= target ? -1 : 1))
}

// Time O(log n), space O(1).
export function binarySearch(arr: readonly number[], target: number): number {
  const index = lowerBound(arr, target)
  return index < arr.length && arr[index] === target ? index : -1
}

// Time O(log n), space O(1). cmp(item) returns negative while item belongs before target,
// zero on a match, positive once item is past it — arr must already be ordered by cmp.
export function lowerBoundBy<T>(arr: readonly T[], cmp: (item: T) => number): number {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cmp(arr[mid]) < 0) lo = mid + 1
    else hi = mid
  }
  return lo
}

// Time O(log(hi - lo)), space O(1). predicate must be false then true across [lo, hi] —
// this is the version worth memorising because it turns "find the boundary" problems
// (minimum capacity, minimum days, first index that fits) into one loop shape.
export function firstTrue(lo: number, hi: number, predicate: (value: number) => boolean): number {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    if (predicate(mid)) hi = mid
    else lo = mid + 1
  }
  return lo
}

// Worked example: smallest ship capacity that clears every package within `days`.
// Capacity too small -> more days needed -> predicate is false; the search is monotone.
export function minCapacityToShipInDays(weights: number[], days: number): number {
  const canShip = (capacity: number): boolean => {
    let neededDays = 1
    let load = 0
    for (const weight of weights) {
      if (load + weight > capacity) {
        neededDays++
        load = 0
      }
      load += weight
    }
    return neededDays <= days
  }

  const lo = Math.max(...weights)
  const hi = weights.reduce((sum, weight) => sum + weight, 0)
  return firstTrue(lo, hi, canShip)
}

suite('lowerBound and upperBound', () => {
  const arr = [1, 3, 3, 3, 5, 7]
  check('lowerBound finds the first match', lowerBound(arr, 3), 1)
  check('upperBound finds one past the last match', upperBound(arr, 3), 4)
  check('lowerBound for a value smaller than all', lowerBound(arr, 0), 0)
  check('lowerBound for a value larger than all', lowerBound(arr, 9), arr.length)
  check('upperBound for a value smaller than all', upperBound(arr, 0), 0)
  check('upperBound for a value larger than all', upperBound(arr, 9), arr.length)
  check('empty array', lowerBound([], 5), 0)
})

suite('binarySearch', () => {
  const arr = [1, 3, 3, 3, 5, 7]
  check('finds a present value', binarySearch(arr, 5), 4)
  check('finds one of several duplicates', arr[binarySearch(arr, 3)], 3)
  check('missing value returns -1', binarySearch(arr, 4), -1)
  check('empty array returns -1', binarySearch([], 1), -1)
  check('smaller than all returns -1', binarySearch(arr, -1), -1)
  check('larger than all returns -1', binarySearch(arr, 100), -1)
})

suite('lowerBoundBy on a generic key', () => {
  const people = [{ age: 20 }, { age: 25 }, { age: 25 }, { age: 30 }]
  const index = lowerBoundBy(people, person => person.age - 25)
  check('generic comparator finds the first match by key', index, 1)
  check('generic comparator on a missing key', lowerBoundBy(people, person => person.age - 99), people.length)
})

suite('firstTrue and the shipping example', () => {
  check('finds the boundary between false and true', firstTrue(0, 10, value => value >= 6), 6)
  check('boundary at the low end', firstTrue(0, 10, () => true), 0)
  check('boundary at the high end sits just past the range', firstTrue(0, 10, () => false), 10)

  check('minimum capacity for a single day', minCapacityToShipInDays([1, 2, 3, 4, 5], 1), 15)
  check('minimum capacity spread across days', minCapacityToShipInDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5), 15)
  check('capacity cannot be smaller than the heaviest package', minCapacityToShipInDays([3, 1, 1], 3), 3)
})

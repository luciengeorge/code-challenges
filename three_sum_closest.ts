// https://leetcode.com/problems/3sum-closest/description/

/**
 * Finds three integers in nums such that the sum is closest to target.
 * @param nums - Array of integers
 * @param target - Target sum to get closest to
 * @returns The sum of the three integers closest to target
 */
function threeSumClosest(nums: number[], target: number): number {
  nums.sort((a, b) => a - b)
  let closestSum = nums[0] + nums[1] + nums[2]
  for (let i = 0; i < nums.length - 1; i++) {
    let left = i + 1
    let right = nums.length - 1
    while (left < right) {
      const currentSum = nums[i] + nums[left] + nums[right]
      if (Math.abs(currentSum - target) < Math.abs(closestSum - target)) {
        closestSum = currentSum
      }

      if (currentSum === target) {
        return closestSum
      }

      if (currentSum < target) {
        left++
      } else {
        right--
      }
    }
  }
  return closestSum
}

// Test cases
function runTests(): void {
  console.log('Testing threeSumClosest...')

  // Example 1
  const result1 = threeSumClosest([-1, 2, 1, -4], 1)
  console.log(`Example 1: ${result1} (expected: 2)`)

  // Example 2
  const result2 = threeSumClosest([0, 0, 0], 1)
  console.log(`Example 2: ${result2} (expected: 0)`)

  // Additional test cases
  const result3 = threeSumClosest([1, 1, 1, 0], -100)
  console.log(`Test 3: ${result3} (expected: 2)`)

  const result4 = threeSumClosest([1, 1, -1, -1, 3], -1)
  console.log(`Test 4: ${result4} (expected: -1)`)
}

// Export for use in other modules
export {threeSumClosest}

// Uncomment the line below to run tests
runTests()

// https://leetcode.com/problems/3sum/description/

function threeSum(nums: number[]): number[][] {
  const result: number[][] = []

  // Sort the array to enable two-pointer technique and easy duplicate handling
  nums.sort((a, b) => a - b)

  for (let i = 0; i < nums.length - 2; i++) {
    // Skip duplicates for the first element
    if (i > 0 && nums[i] === nums[i - 1]) continue

    let left = i + 1
    let right = nums.length - 1

    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right]

      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]])

        // Skip duplicates for the second element
        while (left < right && nums[left] === nums[left + 1]) left++
        // Skip duplicates for the third element
        while (left < right && nums[right] === nums[right - 1]) right--

        left++
        right--
      } else if (sum < 0) {
        left++ // Need a larger sum
      } else {
        right-- // Need a smaller sum
      }
    }
  }

  return result
}

// Test cases
console.log('Test 1:', threeSum([-1, 0, 1, 2, -1, -4])) // Expected: [[-1,-1,2],[-1,0,1]]
console.log('Test 2:', threeSum([0, 1, 1])) // Expected: []
console.log('Test 3:', threeSum([0, 0, 0])) // Expected: [[0,0,0]]
console.log('Test 4:', threeSum([-2, 0, 1, 1, 2])) // Expected: [[-2,0,2],[-2,1,1]]
console.log('Test 5:', threeSum([])) // Expected: []
console.log('Test 6:', threeSum([1, 2, 3])) // Expected: []

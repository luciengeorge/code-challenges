// https://leetcode.com/problems/divide-array-into-arrays-with-max-difference/?envType=daily-question&envId=2025-06-18

function divideArray(nums: number[], k: number): number[][] {
  const result: number[][] = []
  // Sort the array to enable greedy grouping
  nums.sort((a, b) => a - b)

  // Group every 3 consecutive elements and check if they satisfy the condition
  for (let i = 0; i < nums.length; i += 3) {
    const group = [nums[i], nums[i + 1], nums[i + 2]]

    // Check if the difference between max and min in the group is <= k
    if (group[2] - group[0] > k) {
      return [] // Impossible to satisfy the condition
    }

    result.push(group)
  }

  return result
}

console.log(divideArray([1, 3, 4, 8, 7, 9, 3, 5, 1], 2))
console.log(divideArray([2, 4, 2, 2, 5, 2], 2))
console.log(
  divideArray([4, 2, 9, 8, 2, 12, 7, 12, 10, 5, 8, 5, 5, 7, 9, 2, 5, 11], 14),
)

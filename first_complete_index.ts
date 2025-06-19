// https://leetcode.com/problems/first-completely-painted-row-or-column/?envType=daily-question&envId=2025-06-18

function firstCompleteIndex(arr: number[], mat: number[][]): number {
  const m = mat.length
  const n = mat[0].length

  // Create a map from value to position in matrix
  const valueToPos = new Map<number, [number, number]>()
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      valueToPos.set(mat[i][j], [i, j])
    }
  }

  // Track painted cells count in each row and column
  const rowCount = new Array(m).fill(0)
  const colCount = new Array(n).fill(0)

  // Process each element in arr
  for (let i = 0; i < arr.length; i++) {
    const [row, col] = valueToPos.get(arr[i])!

    rowCount[row]++
    colCount[col]++

    // Check if this row or column is complete
    if (rowCount[row] === n || colCount[col] === m) {
      return i
    }
  }

  return -1 // Should never reach here given the constraints
}

console.log(
  firstCompleteIndex(
    [1, 3, 4, 2],
    [
      [1, 4],
      [2, 3],
    ],
  ),
) // Expected: 2

console.log(
  firstCompleteIndex(
    [2, 8, 7, 4, 1, 3, 5, 6, 9],
    [
      [3, 2, 5],
      [1, 4, 6],
      [8, 7, 9],
    ],
  ),
) // Expected: 3

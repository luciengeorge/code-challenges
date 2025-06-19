// https://leetcode.com/problems/longest-common-prefix/description/

function longestCommonPrefix(strs: string[]): string {
  const sortedStrs = strs.sort((a, b) => (a.length < b.length ? -1 : 1))
  const minLength = sortedStrs[0].length
  for (let i = 0; i < minLength; i++) {
    const char = sortedStrs[0][i]
    for (let j = 1; j < sortedStrs.length; j++) {
      if (sortedStrs[j][i] !== char) {
        return sortedStrs[0].substring(0, i)
      }
    }
  }
  return sortedStrs[0].substring(0, minLength)
}

// Test cases
console.log('Test 1:', longestCommonPrefix(['flower', 'flow', 'flight'])) // Expected: "fl"
console.log('Test 2:', longestCommonPrefix(['dog', 'racecar', 'car'])) // Expected: ""
console.log(
  'Test 3:',
  longestCommonPrefix(['interspecies', 'interstellar', 'interstate']),
) // Expected: "inters"
console.log('Test 4:', longestCommonPrefix(['prefix', 'prefixing', 'prefixed'])) // Expected: "prefix"
console.log('Test 5:', longestCommonPrefix(['single'])) // Expected: "single"
console.log('Test 6:', longestCommonPrefix(['', 'empty', 'test'])) // Expected: ""
console.log('Test 7:', longestCommonPrefix(['same', 'same', 'same'])) // Expected: "same"

// https://leetcode.com/problems/letter-combinations-of-a-phone-number/

/**
 * @param digits - String containing digits from 2-9 inclusive
 * @returns Array of all possible letter combinations
 */
function letterCombinations(digits: string): string[] {
  if (!digits || digits.length === 0) {
    return []
  }

  const digitToLetters: Record<string, string> = {
    '2': 'abc',
    '3': 'def',
    '4': 'ghi',
    '5': 'jkl',
    '6': 'mno',
    '7': 'pqrs',
    '8': 'tuv',
    '9': 'wxyz',
  }

  let result: string[] = ['']

  // For each digit, expand all current combinations
  for (const digit of digits) {
    const letters = digitToLetters[digit]
    const newResult: string[] = []

    // For each existing combination, add each possible letter
    for (const combination of result) {
      for (const letter of letters) {
        newResult.push(combination + letter)
      }
    }

    result = newResult
  }

  return result
}

// Test cases
function runTests(): void {
  console.log('Testing letterCombinations...')

  // Example 1
  const result1 = letterCombinations('23')
  console.log(`Example 1: ${JSON.stringify(result1)}`)
  console.log(`Expected: ["ad","ae","af","bd","be","bf","cd","ce","cf"]`)

  // Example 2
  const result2 = letterCombinations('')
  console.log(`Example 2: ${JSON.stringify(result2)}`)
  console.log(`Expected: []`)

  // Example 3
  const result3 = letterCombinations('2')
  console.log(`Example 3: ${JSON.stringify(result3)}`)
  console.log(`Expected: ["a","b","c"]`)

  // Additional test case
  const result4 = letterCombinations('79')
  console.log(`Test 4: ${JSON.stringify(result4)}`)
  console.log(`Expected combinations for 7 (PQRS) and 9 (WXYZ)`)

  console.log('\nTesting iterative solution...')
  const iterResult1 = letterCombinations('23')
  console.log(`Iterative Example 1: ${JSON.stringify(iterResult1)}`)
}

// Export for use in other modules
export {letterCombinations}

// Uncomment the line below to run tests
// runTests();

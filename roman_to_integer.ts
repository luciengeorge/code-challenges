// https://leetcode.com/problems/roman-to-integer/

function romanToInt(s: string): number {
  const map = new Map<string, number>([
    ['I', 1],
    ['IV', 4],
    ['V', 5],
    ['IX', 9],
    ['X', 10],
    ['XL', 40],
    ['L', 50],
    ['XC', 90],
    ['C', 100],
    ['CD', 400],
    ['D', 500],
    ['CM', 900],
    ['M', 1000],
  ])

  const arr = s.split('')
  let result = 0
  while (arr.length > 0) {
    let roman = arr.slice(0, 2).join('')
    let number = map.get(roman)
    if (number) {
      result += number
      arr.shift()
      arr.shift()
    } else {
      let roman = arr.shift()!
      result += map.get(roman)!
    }
  }
  return result
}

// Test cases
console.log('Test 1:', romanToInt('III')) // Expected: 3
console.log('Test 2:', romanToInt('LVIII')) // Expected: 58
console.log('Test 3:', romanToInt('MCMXCIV')) // Expected: 1994
console.log('Test 4:', romanToInt('IV')) // Expected: 4
console.log('Test 5:', romanToInt('IX')) // Expected: 9
console.log('Test 6:', romanToInt('XL')) // Expected: 40
console.log('Test 7:', romanToInt('XC')) // Expected: 90
console.log('Test 8:', romanToInt('CD')) // Expected: 400
console.log('Test 9:', romanToInt('CM')) // Expected: 900

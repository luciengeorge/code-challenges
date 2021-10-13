function twoNumberSum(array, targetSum) {
  const obj = {};
  array.forEach((el) => {
    obj[el] = targetSum - el
  });
  for(const [key, value] of Object.entries(obj)) {
    if (array.includes(value) && +key !== value) {
      console.log('key, value =', key, value)
      return [+key, value];
    }
  };
  return [];
}

console.log(twoNumberSum([3, 5, -4, 8, 11, 1, -1, 6], 10));

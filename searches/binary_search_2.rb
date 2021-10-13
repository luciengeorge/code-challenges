def binary_search(arr, number)
  mid = (arr.size - 1) / 2
  first = 0
  last = arr.size - 1
  while first <= last
    return true if arr[mid] == number

    if number < arr[mid]
      last = mid - 1
    else
      first = mid + 1
    end
    mid = (first + last) / 2
  end
  false
end

arr = [1, 5, 7, 23, 100, 200, 203, 405, 500, 501, 505, 1000]
arr.each do |el|
  p el, binary_search(arr, el)
end

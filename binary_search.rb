def binary_search(arr, elem)
  mid = arr.length / 2
  first = 0
  last = arr.length - 1

  while first <= last
    return true if arr[mid] == elem

    if arr[mid] < elem
      first = mid + 1
    else
      last = mid - 1
    end
    mid = (first + last) / 2
  end
  false
end

arr = [1, 5, 7, 23, 100, 200, 203, 405, 500, 501, 505, 1000]
elem = 24
p binary_search(arr, elem)

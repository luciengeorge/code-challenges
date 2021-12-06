# https://leetcode.com/problems/merge-sorted-array/
def merge(nums1, m, nums2, n)
  i, j, k = n - 1, m - 1, nums1.size - 1

  while i >= 0
    if j < 0
      nums1[k] = nums2[i]
      i -= 1
    elsif nums1[j] > nums2[i]
      nums1[k] = nums1[j]
      j -= 1
    else
      nums1[k] = nums2[i]
      i -= 1
    end
    k -= 1
  end

  nums1
end

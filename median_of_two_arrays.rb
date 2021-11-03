# https://leetcode.com/problems/median-of-two-sorted-arrays/

def find_median_sorted_arrays(nums1, nums2)
  merged = []
  while nums1.any? || nums2.any?
    if nums1.any? && nums2.any?
      merged.push(nums1.first < nums2.first ? nums1.shift : nums2.shift)
    elsif nums2.any?
      merged.push(nums2.shift)
    else
      merged.push(nums1.shift)
    end
  end
  merged.size.even? ? (merged[merged.size / 2 - 1] + merged[merged.size / 2]).fdiv(2) : merged[merged.size / 2]
end

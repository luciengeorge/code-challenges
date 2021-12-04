def odd_even_jumps(a)
  idxs_by_val = a.each_with_index.map { |v, i| [v, i] }.sort { |a, b| a[0] <=> b[0] }.map { |x| x[1] }
  odd_next_hops = get_next_hops(idxs_by_val)
  idxs_by_val_r = a.each_with_index.map { |v, i| [v, i] }.sort { |a, b| b[0] <=> a[0] }.map { |x| x[1] }
  even_next_hops = get_next_hops(idxs_by_val_r)

  odd, even = [false] * a.length, [false] * a.length
  odd[-1], even[-1] = true, true
  (a.length - 2).downto(0).each do |i|
    odd_next_hop, even_next_hop = odd_next_hops[i], even_next_hops[i]
    odd[i] = even[odd_next_hop] if odd_next_hop
    even[i] = odd[even_next_hop] if even_next_hop
  end
  odd.count(&:itself)
end

def get_next_hops(idxs_by_val)
  next_hops = [nil] * idxs_by_val.length
  stack = []

  idxs_by_val.each do |i|
    next_hops[stack.pop] = i while stack[-1] && stack[-1] < i
    stack << i
  end
  p stack
  next_hops
end

arr = [10,13,12,14,15]

p odd_even_jumps(arr)

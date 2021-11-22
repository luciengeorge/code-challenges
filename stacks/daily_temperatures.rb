def daily_temperatures(temperatures)
  wait = Array.new(temperatures.length, 0)
  previous_index = [0]
  temperatures.each_with_index do |temp, idx|
    next if idx.zero?

    while previous_index.any? && temp > temperatures[previous_index.last]
      wait[previous_index.last] = idx - previous_index.last
      previous_index.pop
    end
    previous_index << idx
  end
  wait
end

p daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73])

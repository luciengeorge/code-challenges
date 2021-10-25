# [[5, 10], [20, 10], [5, 5]]

def number_of_stops(stops, start_fuel)
  refuels = []
  current_fuel = start_fuel
  count = 0
  stops.each do |(range, refuel)|
    current_fuel -= range
    refuels.push(refuel)
    while current_fuel <= 0
      return false if refuels.empty?

      max = refuels.max
      current_fuel += max
      refuels.delete_at(refuels.find_index(max))
      count += 1
    end
  end
  count
end
p number_of_stops([[5, 10], [20, 10], [5, 5]], 10)

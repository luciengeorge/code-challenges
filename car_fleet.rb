X = 0
V = 1
def car_fleet(target, position, speed)
  car = position.zip(speed).sort_by(&:first)
  res = 0
  i = car.size
  while i.positive?
    res += 1
    i -= 1
    x, v = car[i]
    i -= 1 while i.positive? && (target - car[i - 1][X]).fdiv(car[i - 1][V]) <= (target - x).fdiv(v)
  end
  res
end

target = 12
position = [10, 8, 0, 5, 3]
speed = [2, 4, 1, 1, 3]
car_fleet(target, position, speed)

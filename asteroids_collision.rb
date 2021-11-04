def asteroid_collision(asteroids)
  result = []
  asteroids.each do |asteroid|
    add_to_stack = true
    last_asteroid_seen = result.last
    while result.any? && asteroids_colliding?(last_asteroid_seen, asteroid)
      if asteroid.abs > last_asteroid_seen.abs # last asteroid explodes
        result.pop
        last_asteroid_seen = result.last
      elsif last_asteroid_seen.abs == asteroid.abs # both explode
        result.pop
        add_to_stack = false
        break
      else # new asteroid will explode
        add_to_stack = false
        break
      end
    end

    result.push(asteroid) if add_to_stack
  end
  result
end

def asteroids_colliding?(last_seen, current)
  last_seen > 0 && current < 0
end

# https://leetcode.com/problems/flood-fill/

def flood_fill(image, sr, sc, new_color)
  queue = [[sr, sc]]
  directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  original_color = image[sr][sc]
  visited = []
  while queue.any?
    y, x = queue.shift
    image[y][x] = new_color
    visited.push([y, x])
    neighbors = directions.map { |y_add, x_add| [y + y_add, x + x_add] }
    neighbors.each do |(yn, xn)|
      next if yn.negative? || xn.negative? || yn >= image.size || xn >= image[0].size || visited.include?([yn, xn]) || image[yn][xn] != original_color

      image[yn][xn] = new_color
      queue.push([yn, xn])
    end
  end
  image
end

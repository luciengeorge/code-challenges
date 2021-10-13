class Robot
  attr_reader :x_coord, :y_coord

  DIRECTION_MAPPING = {
    0 => 'North',
    1 => 'East',
    2 => 'South',
    3 => 'West'
  }

  def initialize(direction: 0, y_coord: 0, x_coord: 0)
    @direction = direction
    @x_coord = x_coord
    @y_coord = y_coord
  end

  def to_s
    "#{direction} (#{x_coord}, #{y_coord})"
  end

  # user will enter a key

  def direction
    DIRECTION_MAPPING[@direction]
  end

  def navigate(inputs)
    chars = inputs.chars
    chars.each do |char|
      case char
      when 'L', 'R'
        update_direction(char)
      when 'F'
        move_forward
      end
    end
  end

  def update_direction(key)
    # key R => right
    # key L => left
    case key
    when 'R'
      @direction = (@direction + 1) % 4
    when 'L'
      @direction = (@direction - 1) % 4
    end
  end

  def move_forward
    case @direction
    when 0
      @y_coord += 1
    when 1
      @x_coord += 1
    when 2
      @y_coord -= 1
    else
      @x_coord -= 1
    end
  end
end

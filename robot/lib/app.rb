require_relative 'robot'

def print_help
  puts "Turn Left (L), Turn Right (R), Move Forward (F), Quit (Q), Help (H)"
end

def ask_for_input
  print "> "
  gets.chomp
end

robot = Robot.new
puts "Welcome!"
puts robot
puts "Start Moving"
print_help
input = ask_for_input
until input == 'Q'
  if input.size > 1
    robot.navigate(input)
  else
    case input
    when 'L', 'R'
      robot.update_direction(input)
    when 'F'
      robot.move_forward
    when 'Q'
      break
    when 'H'
      print_help
    else
      puts "Please enter a valid input"
    end
  end
  puts robot
  input = ask_for_input
end

puts "Bye!"

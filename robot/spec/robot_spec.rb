require_relative '../lib/robot'

RSpec.describe 'Robot' do
  context '::new' do
    it 'should initialize the robot with a direction, an x_coord and a y_coord' do
      robot = Robot.new(direction: 0, x_coord: 0, y_coord: 0)
      expect(robot).to be_a(Robot)
    end
  end

  context '#direction' do
    it 'should return the current direction of the robot (North)' do
      robot = Robot.new(direction: 0, x_coord: 0, y_coord: 0)
      expect(robot.direction).to eq('North')
    end

    it 'should return the current direction of the robot (East)' do
      robot = Robot.new(direction: 1, x_coord: 0, y_coord: 0)
      expect(robot.direction).to eq('East')
    end

    it 'should return the current direction of the robot (South)' do
      robot = Robot.new(direction: 2, x_coord: 0, y_coord: 0)
      expect(robot.direction).to eq('South')
    end

    it 'should return the current direction of the robot (West)' do
      robot = Robot.new(direction: 3, x_coord: 0, y_coord: 0)
      expect(robot.direction).to eq('West')
    end
  end

  context '#x_coord' do
    it 'should return the current x_coord of the robot' do
      robot = Robot.new(direction: 0, x_coord: 0, y_coord: 0)
      expect(robot.x_coord).to eq(0)
    end
  end

  context '#y_coord' do
    it 'should return the current y_coord of the robot' do
      robot = Robot.new(direction: 0, x_coord: 0, y_coord: 0)
      expect(robot.y_coord).to eq(0)
    end
  end

  context '#update_direction' do
    it 'should change the direction\'s value from North to East' do
      robot = Robot.new(direction: 0, x_coord: 0, y_coord: 0)
      robot.update_direction('R')
      expect(robot.direction).to eq('East')
    end

    it 'should change the direction\'s value from North to West' do
      robot = Robot.new(direction: 0, x_coord: 0, y_coord: 0)
      robot.update_direction('L')
      expect(robot.direction).to eq('West')
    end

    it 'should change the direction\'s value from West to North' do
      robot = Robot.new(direction: 3, x_coord: 0, y_coord: 0)
      robot.update_direction('R')
      expect(robot.direction).to eq('North')
    end

    it 'should change the direction\'s value from East to North' do
      robot = Robot.new(direction: 1, x_coord: 0, y_coord: 0)
      robot.update_direction('L')
      expect(robot.direction).to eq('North')
    end
  end

  context '#move_forward' do
    it 'should increment the y_coord by 1 if facing North' do
      robot = Robot.new(direction: 0, x_coord: 0, y_coord: 0)
      robot.move_forward
      expect(robot.y_coord).to eq(1)
    end

    it 'should decrement the y_coord by 1 if facing South' do
      robot = Robot.new(direction: 2, x_coord: 0, y_coord: 0)
      robot.move_forward
      expect(robot.y_coord).to eq(-1)
    end

    it 'should increment the x_coord by 1 if facing East' do
      robot = Robot.new(direction: 1, x_coord: 0, y_coord: 0)
      robot.move_forward
      expect(robot.x_coord).to eq(1)
    end

    it 'should decrement the x_coord by 1 if facing West' do
      robot = Robot.new(direction: 3, x_coord: 0, y_coord: 0)
      robot.move_forward
      expect(robot.x_coord).to eq(-1)
    end
  end
end

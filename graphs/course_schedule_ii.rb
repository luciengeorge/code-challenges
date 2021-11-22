# https://leetcode.com/problems/course-schedule-ii/
require 'set'

def find_order(num_courses, prerequisites)
  graph = Hash.new { |h, k| h[k] = Set.new }
  dependencies = Hash.new { |h, k| h[k] = 0 }
  course_order = []
  queue = []

  prerequisites.each do |course, pre|
    graph[course].add(pre)
    dependencies[pre] += 1
  end

  num_courses.times do |num|
    queue.push(num) if dependencies[num].zero?
  end

  while queue.any?
    curr = queue.shift
    course_order.unshift(curr)
    graph[curr].each do |pre|
      dependencies[pre] -= 1
      queue.push(pre) if dependencies[pre].zero?
    end
  end
  course_order.size == num_courses ? course_order : []
end

num_courses = 4
prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]

p find_order(num_courses, prerequisites)

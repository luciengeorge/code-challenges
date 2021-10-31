# https://leetcode.com/problems/course-schedule/

# @param {Integer} num_courses
# @param {Integer[][]} prerequisites
# @return {Boolean}
def can_finish(num_courses, prerequisites)
  map = {}
  degree = {}
  num_courses.times do |course|
    degree[course] = 0
  end

  prerequisites.each do |course, prereq|
    map[prereq] ||= Set.new
    map[prereq].add(course)
    degree[course] += 1
  end

  count = 0
  queue = []
  degree.each do |course, degrees|
    next unless degrees.zero?

    queue << course
  end

  until queue.empty?
    prereq = queue.shift
    count += 1
    next unless map[prereq]

    map[prereq].each do |course|
      degree[course] -= 1
      queue << course if degree[course].zero?
    end
  end

  count == num_courses
end

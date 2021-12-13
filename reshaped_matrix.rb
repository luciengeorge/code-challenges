# https://leetcode.com/problems/reshape-the-matrix/

def matrix_reshape(mat, r, c)
  return mat unless mat.size * mat.first.size == r * c

  reshaped = Array.new(r) { Array.new(c, nil) }

  i = 0
  j = 0

  r.times do |row_index|
    c.times do |col_index|
      reshaped[row_index][col_index] = mat[i][j]

      j += 1
      if j >= mat.first.size
        i += 1
        j = 0
      end
    end
  end
  reshaped
end


def matrix_reshape(mat, r, c)
  r * c == mat.flatten.size ? mat.flatten.each_slice(c) : mat
end

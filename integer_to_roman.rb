def integer_to_roman(integer)
  mapping = {
    'M' => 1000,
    'CM' => 900,
    'D' => 500,
    'CD' => 400,
    'C' => 100,
    'XC' => 90,
    'L' => 50,
    'XL' => 40,
    'X' => 10,
    'IX' => 9,
    'V' => 5,
    'IV' => 4,
    'I' => 1
  }

  result = ''
  mapping.each do |roman, value|
    next if integer < value

    multiplier = integer / value
    integer = integer % value
    result += roman * multiplier
  end
  result
end

p integer_to_roman(1994)

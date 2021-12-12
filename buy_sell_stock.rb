# https://leetcode.com/problems/best-time-to-buy-and-sell-stock/

def max_profit(prices)
  return 0 if prices.empty?

  max_profit = 0
  min_price = prices[0]

  1.upto(prices.size - 1) do |i|
      min_price = [min_price, prices[i-1]].min
      max_profit = [max_profit, prices[i] - min_price].max
  end

  return max_profit
end

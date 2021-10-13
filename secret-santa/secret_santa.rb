class SecretSanta
  attr_reader :santas, :arrangement

  def initialize(santas)
    @santas = santas
    @arrangement = {}
  end

  def assign
    assignees = santas.dup
    santas.each do |santa|
      arrangement[santa] = assignees.delete((assignees - [santa]).sample)
    end
  end
end

secret_santa = SecretSanta.new(['lucien', 'alex', 'marine', 'gabriel', 'joseph', 'cyril', 'lea'])
secret_santa.assign
p secret_santa.arrangement

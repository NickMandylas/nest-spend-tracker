export type OffsetLoanForecastPoint = {
  month: number
  date: string
  loanBalance: number
  offsetBalance: number
  effectiveDebt: number
  interestPaid: number
}

export type OffsetLoanForecast = {
  points: OffsetLoanForecastPoint[]
  months: number | null
  payoffDate: string | null
  payoffMethod: "offset" | "repayment" | null
  interestPaid: number
}

type ForecastInput = {
  loanBalanceMinor: number
  offsetBalanceMinor: number
  annualRate: number
  monthlyRepaymentMinor: number
  monthlyOffsetChangeMinor: number
  from: string
  maxMonths?: number
}

function addMonths(from: string, months: number) {
  const start = new Date(from)
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth()
  const day = start.getUTCDate()
  const lastDay = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate()

  return new Date(
    Date.UTC(year, month + months, Math.min(day, lastDay), 12)
  ).toISOString()
}

function toMinorUnits(value: number) {
  return Math.round(value * 100)
}

export function projectOffsetLoan({
  loanBalanceMinor,
  offsetBalanceMinor,
  annualRate,
  monthlyRepaymentMinor,
  monthlyOffsetChangeMinor,
  from,
  maxMonths = 1_200,
}: ForecastInput): OffsetLoanForecast {
  let loan = Math.max(0, Math.abs(loanBalanceMinor) / 100)
  let offset = Math.max(0, offsetBalanceMinor / 100)
  const monthlyRate = Math.max(0, annualRate) / 12
  const repayment = Math.max(0, monthlyRepaymentMinor / 100)
  const offsetChange = monthlyOffsetChangeMinor / 100
  let interestPaid = 0

  const points: OffsetLoanForecastPoint[] = [
    {
      month: 0,
      date: addMonths(from, 0),
      loanBalance: toMinorUnits(loan),
      offsetBalance: toMinorUnits(offset),
      effectiveDebt: toMinorUnits(Math.max(0, loan - offset)),
      interestPaid: 0,
    },
  ]

  if (loan <= 0.005 || offset >= loan) {
    return {
      points,
      months: 0,
      payoffDate: points[0].date,
      payoffMethod: offset >= loan && loan > 0.005 ? "offset" : "repayment",
      interestPaid: 0,
    }
  }

  for (let month = 1; month <= maxMonths; month += 1) {
    const interest = Math.max(0, loan - offset) * monthlyRate
    interestPaid += interest
    loan = Math.max(0, loan + interest - repayment)
    offset = Math.max(0, offset + offsetChange)

    const point: OffsetLoanForecastPoint = {
      month,
      date: addMonths(from, month),
      loanBalance: toMinorUnits(loan),
      offsetBalance: toMinorUnits(offset),
      effectiveDebt: toMinorUnits(Math.max(0, loan - offset)),
      interestPaid: toMinorUnits(interestPaid),
    }
    points.push(point)

    if (loan <= 0.005 || offset >= loan) {
      return {
        points,
        months: month,
        payoffDate: point.date,
        payoffMethod: offset >= loan && loan > 0.005 ? "offset" : "repayment",
        interestPaid: point.interestPaid,
      }
    }
  }

  return {
    points,
    months: null,
    payoffDate: null,
    payoffMethod: null,
    interestPaid: toMinorUnits(interestPaid),
  }
}

export function forecastPointAt(forecast: OffsetLoanForecast, month: number) {
  return forecast.points[Math.min(month, forecast.points.length - 1)]
}

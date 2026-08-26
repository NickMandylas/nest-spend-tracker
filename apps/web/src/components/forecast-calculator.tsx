"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendarDue,
  IconInfoCircle,
  IconRotateClockwise,
  IconTrendingUp,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  forecastPointAt,
  projectOffsetLoan,
  type OffsetLoanForecast,
} from "@/lib/forecast"
import { formatCompactMoney, formatDuration, formatMoney } from "@/lib/finance"
import type { FinancialSnapshot } from "@/lib/redbark-types"

type ForecastFields = {
  monthlyIncome: string
  monthlyExpenses: string
  monthlyRepayment: string
  loanBalance: string
  offsetBalance: string
  annualRate: string
}

type MoneyFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  step?: number
}

const MONTH_HORIZONS = [
  { label: "In 1 year", month: 12 },
  { label: "In 5 years", month: 60 },
  { label: "In 10 years", month: 120 },
]

function numberFromField(value: string, maximum = 100_000_000) {
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(maximum, Math.max(0, number))
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
  step = 100,
}: MoneyFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between gap-3 text-[0.68rem] font-medium">
        <span>{label}</span>
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (value === "") onChange("0")
          }}
          className="h-10 pl-7 font-mono text-sm font-medium tabular-nums"
        />
      </div>
    </label>
  )
}

function formatForecastDate(date: string | null) {
  if (!date) return "Beyond forecast"
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

function comparisonCopy(months: number | null, baselineMonths: number | null) {
  if (months === null || baselineMonths === null) return "No comparable payoff"
  const difference = baselineMonths - months
  if (difference === 0) return "Same payoff timing"
  return difference > 0
    ? `${formatDuration(difference)} sooner`
    : `${formatDuration(Math.abs(difference))} later`
}

function buildChartData(forecast: OffsetLoanForecast) {
  const finalMonth = forecast.months ?? forecast.points.length - 1
  const chartEnd = Math.min(finalMonth, 600)

  return forecast.points
    .filter(
      (point) =>
        point.month <= chartEnd &&
        (point.month === 0 ||
          point.month % 12 === 0 ||
          point.month === chartEnd)
    )
    .map((point) => ({
      ...point,
      label:
        point.month === 0
          ? "Now"
          : String(new Date(point.date).getUTCFullYear()),
      loan: point.loanBalance / 100,
      offset: point.offsetBalance / 100,
      effective: point.effectiveDebt / 100,
    }))
}

function ForecastChart({ forecast }: { forecast: OffsetLoanForecast }) {
  const data = buildChartData(forecast)

  return (
    <div
      className="h-[250px] w-full"
      aria-label="Forecast loan, offset and effective debt chart"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 760, height: 250 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 12, right: 6, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="2 8"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={30}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={62}
            tickFormatter={(value) =>
              formatCompactMoney(Math.round(Number(value) * 100))
            }
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <RechartsTooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatMoney(Math.round(Number(value) * 100), true),
              String(name),
            ]}
            labelFormatter={(_, payload) => {
              const date = payload[0]?.payload?.date
              return date
                ? new Intl.DateTimeFormat("en-AU", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(date))
                : ""
            }}
          />
          <Area
            type="monotone"
            dataKey="effective"
            name="Effective debt"
            isAnimationActive={false}
            stroke="var(--foreground)"
            strokeWidth={2.25}
            fill="var(--chart-1)"
            fillOpacity={0.18}
            activeDot={{ r: 3.5, fill: "var(--foreground)", strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="loan"
            name="Loan balance"
            isAnimationActive={false}
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="3 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="offset"
            name="Offset balance"
            isAnimationActive={false}
            stroke="var(--primary)"
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 3.5, fill: "var(--primary)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ForecastCalculator({
  snapshot,
}: {
  snapshot: FinancialSnapshot
}) {
  const offsetAccount = snapshot.accounts.find(
    ({ account }) =>
      account.type === "transaction" ||
      account.name.toLowerCase().includes("offset")
  )
  const loanAccount = snapshot.accounts.find(
    ({ account }) => account.type === "loan"
  )
  const liveLoanBalance = Math.abs(loanAccount?.balance?.current?.amount ?? 0)
  const liveOffsetBalance = Math.max(
    0,
    offsetAccount?.balance?.current?.amount ?? 0
  )
  const liveRepayment = Math.round(
    Number(loanAccount?.details?.loan_details?.min_instalment_amount ?? 0) * 100
  )
  const liveAnnualRate = Number(loanAccount?.details?.lending_rate ?? 0)

  const defaults = React.useMemo<ForecastFields>(
    () => ({
      monthlyIncome: "12000",
      monthlyExpenses: "4000",
      monthlyRepayment: String(Math.round(liveRepayment / 100)),
      loanBalance: String(Math.round(liveLoanBalance / 100)),
      offsetBalance: String(Math.round(liveOffsetBalance / 100)),
      annualRate: (liveAnnualRate * 100).toFixed(2),
    }),
    [liveAnnualRate, liveLoanBalance, liveOffsetBalance, liveRepayment]
  )
  const [fields, setFields] = React.useState<ForecastFields>(defaults)

  const monthlyIncome = numberFromField(fields.monthlyIncome)
  const monthlyExpenses = numberFromField(fields.monthlyExpenses)
  const monthlyRepayment = numberFromField(fields.monthlyRepayment)
  const loanBalance = numberFromField(fields.loanBalance)
  const offsetBalance = numberFromField(fields.offsetBalance)
  const annualRate = numberFromField(fields.annualRate, 25) / 100
  const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyRepayment

  const forecast = projectOffsetLoan({
    loanBalanceMinor: Math.round(loanBalance * 100),
    offsetBalanceMinor: Math.round(offsetBalance * 100),
    annualRate,
    monthlyRepaymentMinor: Math.round(monthlyRepayment * 100),
    monthlyOffsetChangeMinor: Math.round(monthlySurplus * 100),
    from: snapshot.fetchedAt,
  })
  const baseline = projectOffsetLoan({
    loanBalanceMinor: Math.round(loanBalance * 100),
    offsetBalanceMinor: Math.round(offsetBalance * 100),
    annualRate,
    monthlyRepaymentMinor: Math.round(monthlyRepayment * 100),
    monthlyOffsetChangeMinor: 0,
    from: snapshot.fetchedAt,
  })
  const interestDifference =
    baseline.months !== null && forecast.months !== null
      ? baseline.interestPaid - forecast.interestPaid
      : null
  const effectiveDebt = Math.max(0, loanBalance - offsetBalance)
  const chartDataAvailable = forecast.points.length > 1

  function updateField(field: keyof ForecastFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }))
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.62rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
            Planning calculator
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Forecast
          </h1>
          <p className="mt-1 max-w-xl text-xs text-pretty text-muted-foreground">
            See when your offset could cover the property loan, and how changes
            to income, expenses or balance affect the result.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setFields(defaults)}
          className="h-10 self-start rounded-md px-3 transition-transform duration-150 ease-out active:scale-[0.96] sm:self-auto"
        >
          <IconRotateClockwise />
          Reset to latest balances
        </Button>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="p-4 sm:p-5 xl:border-r xl:border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                  Monthly cashflow
                </p>
                <h2 className="mt-1 text-base font-semibold text-balance">
                  What stays in the offset
                </h2>
              </div>
              <IconTrendingUp className="size-5 text-muted-foreground" />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <MoneyField
                id="monthly-income"
                label="Take-home pay"
                value={fields.monthlyIncome}
                onChange={(value) => updateField("monthlyIncome", value)}
                hint="per month"
              />
              <MoneyField
                id="monthly-expenses"
                label="Living expenses"
                value={fields.monthlyExpenses}
                onChange={(value) => updateField("monthlyExpenses", value)}
                hint="per month"
              />
              <MoneyField
                id="monthly-repayment"
                label="Loan repayment"
                value={fields.monthlyRepayment}
                onChange={(value) => updateField("monthlyRepayment", value)}
                hint="per month"
              />
            </div>

            <div className="mt-5 rounded-xl bg-muted p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] text-muted-foreground">
                    Monthly offset change
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${
                      monthlySurplus >= 0 ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {formatMoney(Math.round(monthlySurplus * 100), true)}
                  </p>
                </div>
                {monthlySurplus >= 0 ? (
                  <IconArrowUpRight className="size-5 text-primary" />
                ) : (
                  <IconArrowDownRight className="size-5 text-destructive" />
                )}
              </div>
              <p className="mt-2 text-[0.65rem] leading-relaxed text-pretty text-muted-foreground">
                Pay minus living costs and the scheduled repayment. A positive
                amount remains in your offset each month.
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="grid border-b border-border sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] sm:divide-x sm:divide-border">
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IconCalendarDue className="size-4" />
                  Fully repayable
                </div>
                <p className="mt-3 text-3xl leading-none font-semibold tracking-tight text-balance tabular-nums sm:text-4xl">
                  {forecast.months === null
                    ? "Beyond model"
                    : formatDuration(forecast.months)}
                </p>
                <p className="mt-2 text-sm font-medium tabular-nums">
                  {formatForecastDate(forecast.payoffDate)}
                </p>
                <p className="mt-2 max-w-lg text-xs leading-relaxed text-pretty text-muted-foreground">
                  {forecast.payoffMethod === "offset"
                    ? "At this point, the projected offset can clear the remaining loan balance."
                    : forecast.payoffMethod === "repayment"
                      ? "At this point, scheduled repayments reduce the loan balance to zero."
                      : "These assumptions do not clear the effective debt within the 100-year model window."}
                </p>
              </div>
              <div className="border-t border-border p-4 sm:border-t-0 sm:p-5">
                <p className="text-xs text-muted-foreground">
                  Effective debt today
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(Math.round(effectiveDebt * 100), true)}
                </p>
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-[0.65rem] text-muted-foreground">
                    Versus holding the offset flat
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {comparisonCopy(forecast.months, baseline.months)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-semibold">Balance trajectory</p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                    Projected at an unchanged rate
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[0.62rem] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-foreground" />
                    Effective debt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary" />
                    Offset
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-muted-foreground" />
                    Loan
                  </span>
                </div>
              </div>
              <div className="mt-2">
                {chartDataAvailable ? (
                  <ForecastChart forecast={forecast} />
                ) : (
                  <div className="grid h-[250px] place-items-center border-y border-dashed border-border text-xs text-muted-foreground">
                    Add a loan balance to build the forecast.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3 grid gap-3 xl:grid-cols-[390px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="text-[0.62rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
            Loan scenario
          </p>
          <h2 className="mt-1 text-base font-semibold text-balance">
            Try another starting balance
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MoneyField
              id="loan-balance"
              label="Loan balance"
              value={fields.loanBalance}
              onChange={(value) => updateField("loanBalance", value)}
              hint="starting"
              step={1_000}
            />
            <MoneyField
              id="offset-balance"
              label="Offset balance"
              value={fields.offsetBalance}
              onChange={(value) => updateField("offsetBalance", value)}
              hint="starting"
              step={1_000}
            />
            <label
              htmlFor="annual-rate"
              className="block sm:col-span-2 xl:col-span-1"
            >
              <span className="flex items-center justify-between gap-3 text-[0.68rem] font-medium">
                <span>Interest rate</span>
                <span className="text-muted-foreground">annual</span>
              </span>
              <div className="relative mt-1.5">
                <Input
                  id="annual-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="25"
                  step="0.01"
                  value={fields.annualRate}
                  onChange={(event) =>
                    updateField("annualRate", event.target.value)
                  }
                  onBlur={() => {
                    if (fields.annualRate === "") updateField("annualRate", "0")
                  }}
                  className="h-10 pr-8 font-mono text-sm font-medium tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-2 border-b border-border md:grid-cols-4 md:divide-x md:divide-border">
            <div className="p-4">
              <p className="text-[0.65rem] text-muted-foreground">
                Interest impact
              </p>
              <p
                className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${
                  interestDifference !== null && interestDifference >= 0
                    ? "text-primary"
                    : "text-destructive"
                }`}
              >
                {interestDifference === null
                  ? "Not available"
                  : formatMoney(Math.abs(interestDifference), true)}
              </p>
              <p className="mt-1 text-[0.62rem] text-muted-foreground">
                {interestDifference === null
                  ? "No baseline payoff"
                  : interestDifference >= 0
                    ? "saved"
                    : "additional interest"}
              </p>
            </div>
            <div className="border-l border-border p-4 md:border-l-0">
              <p className="text-[0.65rem] text-muted-foreground">
                Forecast interest
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
                {forecast.months === null
                  ? "Beyond model"
                  : formatMoney(forecast.interestPaid, true)}
              </p>
              <p className="mt-1 text-[0.62rem] text-muted-foreground">
                until repayable
              </p>
            </div>
            <div className="border-t border-border p-4 md:border-t-0">
              <p className="text-[0.65rem] text-muted-foreground">
                Annual offset movement
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
                {formatMoney(Math.round(monthlySurplus * 12 * 100), true)}
              </p>
              <p className="mt-1 text-[0.62rem] text-muted-foreground">
                at this cashflow
              </p>
            </div>
            <div className="border-t border-l border-border p-4 md:border-t-0 md:border-l-0">
              <p className="text-[0.65rem] text-muted-foreground">
                Starting offset cover
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
                {loanBalance > 0
                  ? `${Math.min(100, (offsetBalance / loanBalance) * 100).toFixed(2)}%`
                  : "100%"}
              </p>
              <p className="mt-1 text-[0.62rem] text-muted-foreground">
                of loan balance
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Expected balances</p>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                  How the loan and offset move together
                </p>
              </div>
              <IconInfoCircle className="size-4 text-muted-foreground" />
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead className="border-b border-border text-[0.62rem] tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="pb-2 font-medium">Point in time</th>
                    <th className="pb-2 text-right font-medium">Loan</th>
                    <th className="pb-2 text-right font-medium">Offset</th>
                    <th className="pb-2 text-right font-medium">
                      Effective debt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MONTH_HORIZONS.map((horizon) => {
                    const point = forecastPointAt(forecast, horizon.month)
                    const reachedPayoff =
                      forecast.months !== null &&
                      forecast.months <= horizon.month
                    return (
                      <tr key={horizon.month}>
                        <td className="py-3 font-medium">
                          {horizon.label}
                          {reachedPayoff && (
                            <span className="ml-2 text-[0.62rem] font-normal text-primary">
                              repayable
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums">
                          {formatMoney(point.loanBalance, true)}
                        </td>
                        <td className="py-3 text-right font-mono text-primary tabular-nums">
                          {formatMoney(point.offsetBalance, true)}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold tabular-nums">
                          {formatMoney(point.effectiveDebt, true)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-4 flex items-start gap-2 border-t border-border py-4 text-[0.62rem] leading-relaxed text-pretty text-muted-foreground">
        <IconInfoCircle className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Forecasts are indicative only. They assume monthly cashflow, an
          unchanged interest rate and no fees. “Fully repayable” means the
          offset is projected to cover the remaining loan; the loan is not
          closed automatically.
        </p>
      </footer>
    </div>
  )
}

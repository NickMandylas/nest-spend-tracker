"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  IconArrowLeft,
  IconChartLine,
  IconInfoCircle,
  IconLayoutDashboard,
  IconListDetails,
  IconMaximize,
  IconMinimize,
  IconMoon,
  IconPigMoney,
  IconPresentationAnalytics,
  IconRefresh,
  IconScale,
  IconSettings,
  IconSparkles,
  IconSun,
  IconTargetArrow,
} from "@tabler/icons-react"

import { syncBankingData } from "@/app/actions/banking-data"
import { ActivityDataTable } from "@/components/activity-data-table"
import { AccountNameDialog } from "@/components/account-name-dialog"
import {
  BudgetDialog,
  type BudgetCategoryOption,
} from "@/components/budget-dialog"
import { ForecastCalculator } from "@/components/forecast-calculator"
import { useFinanceChat } from "@/components/finance-chat-provider"
import { InstitutionLogo } from "@/components/institution-logo"
import { MerchantLogo } from "@/components/merchant-logo"
import { NetWorthDashboard } from "@/components/net-worth-dashboard"
import { SettingsPanel } from "@/components/settings-panel"
import { TransactionDetailsSheet } from "@/components/transaction-details-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  addDaysToDateKey,
  buildPayoffSeries,
  calculateLoanProjection,
  flattenTransactions,
  formatCategory,
  formatCompactMoney,
  formatDateKey,
  formatDuration,
  formatMoney,
  formatTransactionDateTime,
  getDateKeyInTimeZone,
  getMerchantName,
  isEverydaySpend,
} from "@/lib/finance"
import type {
  DashboardPreferences,
  MonthlyBudgets,
} from "@/lib/preferences-types"
import type { NetWorthProfile } from "@/lib/net-worth-types"
import type { FinancialSnapshot, Transaction } from "@/lib/redbark-types"

type TimeRange = "7d" | "30d" | "120d"
type DashboardView =
  "overview" | "net-worth" | "forecast" | "activity" | "settings" | "dashboard"

type SpendCategory = {
  category: string
  label: string
  amount: number
  percentage: number
  colour: string
  chartColour: string
  chartKey: string
}

type DailySpendPoint = {
  date: string
  label: string
  total: number
  [key: string]: string | number
}

type DebtOutlookPoint = {
  label: string
  balance: number
}

const RANGE_DAYS: Record<TimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "120d": 120,
}

const CATEGORY_COLOURS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-muted-foreground",
]

const CATEGORY_CHART_COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
]

const OTHER_CATEGORY = "__OTHER__"

const subscribeToClientRender = () => () => undefined

function HeaderActionTooltip({
  children,
  label,
}: {
  children: React.ReactElement
  label: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={7}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: IconLayoutDashboard, view: "overview" },
  {
    label: "Net Worth",
    href: "/net-worth",
    icon: IconScale,
    view: "net-worth",
  },
  {
    label: "Forecast",
    href: "/forecast",
    icon: IconChartLine,
    view: "forecast",
  },
  {
    label: "Activity",
    href: "/activity",
    icon: IconListDetails,
    view: "activity",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: IconSettings,
    view: "settings",
  },
]

function requestDashboardFullscreen() {
  if (
    document.fullscreenElement ||
    !document.fullscreenEnabled ||
    !document.documentElement.requestFullscreen
  ) {
    return
  }

  void document.documentElement.requestFullscreen().catch(() => undefined)
}

function DashboardViewControls() {
  const router = useRouter()
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    const updateFullscreenState = () =>
      setIsFullscreen(Boolean(document.fullscreenElement))

    updateFullscreenState()
    document.addEventListener("fullscreenchange", updateFullscreenState)
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreenState)
  }, [])

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await document.documentElement.requestFullscreen()
  }

  async function returnToOverview() {
    if (document.fullscreenElement) await document.exitFullscreen()
    router.push("/")
  }

  return (
    <div
      className="fixed top-2 right-2 z-50 flex items-center gap-1 rounded-lg border border-border bg-background/90 p-1 opacity-40 backdrop-blur-sm transition-opacity focus-within:opacity-100 hover:opacity-100"
      aria-label="Dashboard view controls"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-md"
        onClick={returnToOverview}
        aria-label="Return to overview"
      >
        <IconArrowLeft />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 rounded-md"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <IconMinimize /> : <IconMaximize />}
      </Button>
    </div>
  )
}

function sumTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (total, transaction) => total + Math.abs(transaction.amount?.amount ?? 0),
    0
  )
}

function buildDailySpendData(
  transactions: Transaction[],
  rangeStart: string,
  todayKey: string,
  categories: SpendCategory[]
) {
  const totals = new Map<string, Record<string, number>>()
  const categoryKeys = new Map(
    categories
      .filter((category) => category.category !== OTHER_CATEGORY)
      .map((category) => [category.category, category.chartKey] as const)
  )
  const otherKey = categories.find(
    (category) => category.category === OTHER_CATEGORY
  )?.chartKey

  transactions.forEach((transaction) => {
    const category = transaction.provider_category ?? "UNCATEGORISED"
    const chartKey = categoryKeys.get(category) ?? otherKey
    const amount = Math.abs(transaction.amount?.amount ?? 0) / 100
    const day = totals.get(transaction.date) ?? { total: 0 }

    day.total += amount
    if (chartKey) day[chartKey] = (day[chartKey] ?? 0) + amount
    totals.set(transaction.date, day)
  })

  const data: DailySpendPoint[] = []
  for (
    let date = rangeStart;
    date <= todayKey;
    date = addDaysToDateKey(date, 1)
  ) {
    const point: DailySpendPoint = {
      date,
      label: formatDateKey(date),
      total: totals.get(date)?.total ?? 0,
    }
    categories.forEach((category) => {
      point[category.chartKey] = totals.get(date)?.[category.chartKey] ?? 0
    })
    data.push(point)
  }
  return data
}

function buildCategoryData(transactions: Transaction[]): SpendCategory[] {
  const totals = new Map<string, number>()
  transactions.forEach((transaction) => {
    const category = transaction.provider_category ?? "UNCATEGORISED"
    totals.set(
      category,
      (totals.get(category) ?? 0) + Math.abs(transaction.amount?.amount ?? 0)
    )
  })

  const total = sumTransactions(transactions)
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const chartCategories = sorted.slice(0, 5)

  if (sorted.length > 5) {
    chartCategories.push([
      OTHER_CATEGORY,
      sorted.slice(5).reduce((sum, [, amount]) => sum + amount, 0),
    ])
  }

  return chartCategories.map(([category, amount], index) => ({
    category,
    label: category === OTHER_CATEGORY ? "Other" : formatCategory(category),
    amount,
    percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    colour: CATEGORY_COLOURS[index],
    chartColour: CATEGORY_CHART_COLOURS[index],
    chartKey: `category_${index}`,
  }))
}

function buildBudgetCategoryOptions(
  transactions: Transaction[],
  categoryBudgets: Record<string, number>,
  knownTransactions: Transaction[] = transactions
): BudgetCategoryOption[] {
  const totals = new Map<string, number>()
  transactions.forEach((transaction) => {
    const category = transaction.provider_category ?? "UNCATEGORISED"
    totals.set(
      category,
      (totals.get(category) ?? 0) + Math.abs(transaction.amount?.amount ?? 0)
    )
  })

  const knownCategories = knownTransactions.map(
    (transaction) => transaction.provider_category ?? "UNCATEGORISED"
  )

  return [
    ...new Set([
      ...knownCategories,
      ...totals.keys(),
      ...Object.keys(categoryBudgets),
    ]),
  ]
    .map((category) => ({
      category,
      label: formatCategory(category),
      spent: totals.get(category) ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent || a.label.localeCompare(b.label))
}

function buildDebtOutlook({
  loanBalance,
  offsetBalance,
  annualRate,
  monthlyPayment,
  from,
}: {
  loanBalance: number
  offsetBalance: number
  annualRate: number
  monthlyPayment: number
  from: string
}): DebtOutlookPoint[] {
  const points: DebtOutlookPoint[] = []
  const start = new Date(from)
  let balance = loanBalance

  for (let month = 0; month <= 12; month += 1) {
    const date = new Date(start)
    date.setUTCMonth(start.getUTCMonth() + month)
    points.push({
      label: new Intl.DateTimeFormat("en-AU", {
        month: "short",
        year: month === 0 || month === 12 ? "numeric" : undefined,
        timeZone: "UTC",
      }).format(date),
      balance: Math.max(0, Math.round(balance - offsetBalance)),
    })

    const monthlyInterest =
      Math.max(0, balance - offsetBalance) * (annualRate / 12)
    balance = Math.max(0, balance + monthlyInterest - monthlyPayment)
  }

  return points
}

function getDaysInMonth(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function monthLabelForDashboard(month: string) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`))
}

function monthsUntil(from: string, to: string | undefined) {
  if (!to) return null
  const start = new Date(from)
  const end = new Date(`${to}T00:00:00Z`)
  return Math.max(
    0,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      end.getUTCMonth() -
      start.getUTCMonth()
  )
}

function DailySpendChart({
  data,
  categories,
  selectedCategory,
}: {
  data: DailySpendPoint[]
  categories: SpendCategory[]
  selectedCategory: string
}) {
  const hasSpend = data.some((point) => point.total > 0)
  const visibleCategories =
    selectedCategory === "all"
      ? categories
      : categories.filter((category) => category.category === selectedCategory)

  if (!hasSpend) {
    return (
      <div className="flex h-[200px] items-center justify-center border-y border-dashed border-border text-xs text-muted-foreground">
        No everyday spending in this period.
      </div>
    )
  }

  return (
    <div className="h-[200px] w-full" aria-label="Daily spending chart">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 800, height: 200 }}
      >
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 4, left: -18, bottom: 0 }}
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
            minTickGap={34}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(value) => `$${value}`}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <RechartsTooltip
            cursor={{ stroke: "var(--primary)", strokeDasharray: "3 5" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatMoney(Math.round(Number(value) * 100)),
              String(name),
            ]}
            labelFormatter={(_, payload) =>
              payload[0]?.payload?.date
                ? formatDateKey(payload[0].payload.date, {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })
                : ""
            }
          />
          {visibleCategories.map((category) => (
            <Area
              key={category.category}
              type="monotone"
              dataKey={category.chartKey}
              name={category.label}
              stackId={selectedCategory === "all" ? "spend" : undefined}
              isAnimationActive={false}
              stroke={category.chartColour}
              strokeWidth={selectedCategory === "all" ? 1.5 : 2.5}
              fill={category.chartColour}
              fillOpacity={selectedCategory === "all" ? 0.42 : 0.28}
              activeDot={{
                r: 3.5,
                fill: category.chartColour,
                strokeWidth: 0,
              }}
            />
          ))}
          {selectedCategory === "all" && (
            <Line
              type="monotone"
              dataKey="total"
              name="All spending"
              isAnimationActive={false}
              stroke="var(--foreground)"
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 3.5, fill: "var(--foreground)", strokeWidth: 0 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function PayoffChart({ data }: { data: { year: string; balance: number }[] }) {
  return (
    <div
      className="h-[210px] w-full"
      aria-label="Projected property loan balance chart"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 720, height: 210 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 20, right: 6, left: -6, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="2 8"
          />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={62}
            tickFormatter={(value) => formatCompactMoney(Number(value) * 100)}
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
            formatter={(value) => [
              formatMoney(Math.round(Number(value) * 100), true),
              "Projected balance",
            ]}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Area
            type="monotone"
            dataKey="balance"
            isAnimationActive={false}
            stroke="var(--foreground)"
            strokeWidth={2.5}
            fill="var(--chart-1)"
            fillOpacity={0.5}
            activeDot={{ r: 4, fill: "var(--foreground)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function DebtOutlookChart({ data }: { data: DebtOutlookPoint[] }) {
  const balances = data.map((point) => point.balance)
  const minimum = Math.min(...balances)
  const maximum = Math.max(...balances)
  const padding = Math.max(1, (maximum - minimum) * 0.2)

  return (
    <div
      className="h-20 w-full"
      aria-label="Twelve month effective debt outlook"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 420, height: 80 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 8, right: 2, bottom: 2, left: 2 }}
        >
          <YAxis
            hide
            domain={[Math.max(0, minimum - padding), maximum + padding]}
          />
          <RechartsTooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "3 4" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--popover-foreground)",
              fontSize: 11,
            }}
            formatter={(value) => [
              formatMoney(Number(value), true),
              "Effective debt",
            ]}
          />
          <Area
            type="monotone"
            dataKey="balance"
            isAnimationActive={false}
            stroke="var(--primary)"
            strokeWidth={2}
            fill="var(--chart-1)"
            fillOpacity={0.2}
            dot={false}
            activeDot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function OffsetGauge({
  offsetBalance,
  loanBalance,
  expectedNextBalance,
  monthlyTakeHomeIncome,
  monthlyPayment,
  expectedMonthlyExpenses,
}: {
  offsetBalance: number
  loanBalance: number
  expectedNextBalance: number
  monthlyTakeHomeIncome: number
  monthlyPayment: number
  expectedMonthlyExpenses: number
}) {
  const coverage = loanBalance > 0 ? (offsetBalance / loanBalance) * 100 : 0
  const radius = 79
  const circumference = 2 * Math.PI * radius
  const dashOffset =
    circumference - (Math.min(100, Math.max(0, coverage)) / 100) * circumference

  return (
    <article className="flex min-h-80 flex-col rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-xs text-muted-foreground">Offset balance</p>
        <p className="mt-1 text-sm font-medium">Available against your loan</p>
      </div>

      <div className="relative mx-auto my-auto grid size-52 place-items-center">
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 size-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="13"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="relative text-center">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formatMoney(offsetBalance, true)}
          </p>
          <div className="mx-auto mt-2 w-fit rounded-lg bg-muted px-2.5 py-1 text-xs font-medium tabular-nums">
            {coverage.toFixed(2)}% of loan
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="w-full rounded-xl bg-muted p-3 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-muted/80 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.96]"
              aria-label="Explain expected next monthly balance"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Expected next monthly balance
                  <IconInfoCircle className="size-3.5" />
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(expectedNextBalance)}
                </span>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="max-w-sm">
            Current offset {formatMoney(offsetBalance)}, plus{" "}
            {formatMoney(monthlyTakeHomeIncome)} take-home income, less{" "}
            {formatMoney(monthlyPayment)} repayment, less{" "}
            {formatMoney(expectedMonthlyExpenses)} expenses.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </article>
  )
}

function AccountPanel({
  account,
  preference,
}: {
  account: FinancialSnapshot["accounts"][number]
  preference: DashboardPreferences["accounts"][string]
}) {
  const current = account.balance?.current?.amount ?? 0
  const available = account.balance?.available?.amount
  const isLoan = account.account.type === "loan"
  const [displayName, setDisplayName] = React.useState(
    preference?.displayName ?? account.account.name
  )

  return (
    <article className="group relative min-h-52 overflow-hidden p-4 transition-colors hover:bg-muted/50 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <InstitutionLogo
            name={account.account.institution.name}
            src={account.account.institution.logo}
            className="size-12 rounded-xl"
          />
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {isLoan ? "Property loan" : "Offset account"}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold">
              {displayName}
            </h3>
            <p className="mt-0.5 truncate font-mono text-[0.58rem] text-muted-foreground">
              {account.account.name}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className="gap-1 border-emerald-700/20 bg-emerald-600/5 text-emerald-800 dark:text-emerald-300"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Live
          </Badge>
          <AccountNameDialog
            accountId={account.account.id}
            displayName={displayName}
            providerName={account.account.name}
            institutionName={account.account.institution.name}
            onSaved={setDisplayName}
          />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl">
          {formatMoney(isLoan ? Math.abs(current) : current, true)}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {isLoan ? "Outstanding balance" : "Current balance"}
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3 border-t border-border pt-3 text-xs">
        <div>
          <p className="text-muted-foreground">
            {available !== null && available !== undefined
              ? isLoan
                ? "Available redraw"
                : "Available now"
              : "Account"}
          </p>
          <p className="mt-1 font-mono text-[0.7rem] font-medium">
            {available !== null && available !== undefined
              ? formatMoney(Math.abs(available))
              : account.account.account_number}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Account</p>
          <p className="mt-1 font-mono text-[0.7rem] font-medium">
            {account.account.account_number}
          </p>
        </div>
      </div>
    </article>
  )
}

export function SpendDashboard({
  snapshot,
  preferences,
  budgets,
  netWorthProfile,
  view = "overview",
}: {
  snapshot: FinancialSnapshot
  preferences: DashboardPreferences
  budgets: MonthlyBudgets
  netWorthProfile?: NetWorthProfile
  view?: DashboardView
}) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { isOpen: isChatOpen, openChat } = useFinanceChat()
  const isThemeMounted = React.useSyncExternalStore(
    subscribeToClientRender,
    () => true,
    () => false
  )
  const [isRefreshing, startRefresh] = React.useTransition()
  const [refreshError, setRefreshError] = React.useState<string | null>(null)
  const [timeRange, setTimeRange] = React.useState<TimeRange>("30d")
  const [selectedSpendCategory, setSelectedSpendCategory] =
    React.useState("all")
  const [activeBudgets, setActiveBudgets] = React.useState(budgets)
  const [selectedOverviewTransaction, setSelectedOverviewTransaction] =
    React.useState<Transaction | null>(null)
  const isDashboardView = view === "dashboard"

  const accountMap = React.useMemo(
    () =>
      new Map(
        snapshot.accounts.map(({ account }) => [account.id, account] as const)
      ),
    [snapshot.accounts]
  )

  const allTransactions = React.useMemo(
    () => flattenTransactions(snapshot.accounts),
    [snapshot.accounts]
  )
  const selectedOverviewAccount = selectedOverviewTransaction
    ? (accountMap.get(selectedOverviewTransaction.account) ?? null)
    : null
  const selectedOverviewAccountPreference = selectedOverviewAccount
    ? preferences.accounts[selectedOverviewAccount.id]
    : null

  const todayKey = getDateKeyInTimeZone(
    new Date(snapshot.fetchedAt),
    snapshot.timezone
  )
  const rangeStart = addDaysToDateKey(todayKey, -(RANGE_DAYS[timeRange] - 1))
  const monthStart = `${todayKey.slice(0, 7)}-01`

  const everydaySpend = React.useMemo(
    () =>
      allTransactions.filter((transaction) =>
        isEverydaySpend(transaction, accountMap.get(transaction.account))
      ),
    [accountMap, allTransactions]
  )

  const rangeSpend = everydaySpend.filter(
    (transaction) =>
      transaction.date >= rangeStart && transaction.date <= todayKey
  )
  const monthSpend = everydaySpend.filter(
    (transaction) =>
      transaction.date >= monthStart && transaction.date <= todayKey
  )
  const monthSpendTotal = sumTransactions(monthSpend)
  const currentDay = Number(todayKey.slice(-2))
  const projectedSpend = Math.round(
    (monthSpendTotal / Math.max(1, currentDay)) * getDaysInMonth(todayKey)
  )

  const categories = buildCategoryData(rangeSpend)
  const budgetCategories = buildBudgetCategoryOptions(
    monthSpend,
    activeBudgets.categories,
    everydaySpend
  )
  const monthSpendByCategory = new Map(
    budgetCategories.map((category) => [category.category, category.spent])
  )
  const activeSpendCategory =
    selectedSpendCategory === "all" ||
    categories.some((category) => category.category === selectedSpendCategory)
      ? selectedSpendCategory
      : "all"
  const chartData = buildDailySpendData(
    rangeSpend,
    rangeStart,
    todayKey,
    categories
  )
  const recentExpenseTransactions = monthSpend.slice(0, 2)
  const totalBudgetProgress = activeBudgets.total
    ? Math.min(100, Math.round((monthSpendTotal / activeBudgets.total) * 100))
    : 0

  const offsetAccount = snapshot.accounts.find(
    ({ account }) =>
      account.type === "transaction" ||
      account.name.toLowerCase().includes("offset")
  )
  const loanAccount = snapshot.accounts.find(
    ({ account }) => account.type === "loan"
  )
  const offsetBalance = Math.max(
    0,
    offsetAccount?.balance?.current?.amount ?? 0
  )
  const loanBalance = Math.abs(loanAccount?.balance?.current?.amount ?? 0)
  const effectiveLoan = Math.max(0, loanBalance - offsetBalance)
  const loanDetails = loanAccount?.details?.loan_details
  const annualRate = Number(loanAccount?.details?.lending_rate ?? 0)
  const monthlyPayment = Math.round(
    Number(loanDetails?.min_instalment_amount ?? 0) * 100
  )
  const expectedMonthlyExpenses = activeBudgets.total ?? projectedSpend
  const monthlyTakeHomeIncome = preferences.property.monthlyTakeHomeIncomeMinor
  const expectedNextOffsetBalance =
    offsetBalance +
    monthlyTakeHomeIncome -
    monthlyPayment -
    expectedMonthlyExpenses
  const debtOutlook = buildDebtOutlook({
    loanBalance,
    offsetBalance,
    annualRate,
    monthlyPayment,
    from: snapshot.fetchedAt,
  })
  const projectedEffectiveDebt = debtOutlook.at(-1)?.balance ?? effectiveLoan
  const projectedDebtReduction = Math.max(
    0,
    effectiveLoan - projectedEffectiveDebt
  )
  const projection =
    loanBalance > 0 && annualRate > 0 && monthlyPayment > 0
      ? calculateLoanProjection({
          principalMinor: loanBalance,
          annualRate,
          monthlyPaymentMinor: monthlyPayment,
          offsetMinor: offsetBalance,
          from: snapshot.fetchedAt,
        })
      : null
  const baselineProjection =
    loanBalance > 0 && annualRate > 0 && monthlyPayment > 0
      ? calculateLoanProjection({
          principalMinor: loanBalance,
          annualRate,
          monthlyPaymentMinor: monthlyPayment,
          from: snapshot.fetchedAt,
        })
      : null
  const contractualMonths = monthsUntil(
    snapshot.fetchedAt,
    loanDetails?.loan_end_date
  )
  const payoffSeries =
    projection && loanBalance > 0
      ? buildPayoffSeries({
          principalMinor: loanBalance,
          annualRate,
          monthlyPaymentMinor: monthlyPayment,
          offsetMinor: offsetBalance,
          from: snapshot.fetchedAt,
        })
      : []
  const monthsSaved =
    projection && baselineProjection
      ? Math.max(0, baselineProjection.months - projection.months)
      : 0
  const interestSaved =
    projection && baselineProjection
      ? Math.max(0, baselineProjection.interestPaid - projection.interestPaid)
      : 0
  const offsetCoverage =
    loanBalance > 0 ? (offsetBalance / loanBalance) * 100 : 0

  const warnings = snapshot.accounts.flatMap((account) => account.warnings)
  const refreshedAt = new Intl.DateTimeFormat("en-AU", {
    timeZone: snapshot.timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(snapshot.fetchedAt))

  function refresh() {
    setRefreshError(null)
    startRefresh(async () => {
      const result = await syncBankingData()
      if (!result.ok) {
        setRefreshError(result.message)
        return
      }

      router.refresh()
    })
  }

  function openDashboardView() {
    requestDashboardFullscreen()
    router.push("/dashboard")
  }

  return (
    <>
      <main className="min-h-full min-w-0 overflow-hidden">
        {!isDashboardView && (
          <header className="sticky top-0 z-40 border-b border-border bg-background">
            <div className="flex h-14 items-center px-3 sm:px-5 lg:px-6">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
                aria-label="Nest overview"
              >
                <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
                  <IconPigMoney className="size-4" />
                </span>
                <span>
                  <span className="block text-base leading-none font-semibold tracking-tight">
                    Nest
                  </span>
                  <span className="mt-1 hidden text-[0.6rem] leading-none text-muted-foreground sm:block">
                    Household ledger
                  </span>
                </span>
              </Link>

              <nav
                className="ml-7 hidden items-center gap-1 lg:flex"
                aria-label="Primary navigation"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = item.view === view

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                      }`}
                    >
                      <item.icon className="size-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <TooltipProvider delayDuration={200}>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="mr-0.5 hidden items-center gap-2 text-[0.65rem] text-muted-foreground xl:flex">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Updated {refreshedAt}
                  </div>
                  <HeaderActionTooltip
                    label={
                      isRefreshing ? "Refreshing data…" : "Refresh banking data"
                    }
                  >
                    <Button
                      variant="outline"
                      size="icon-lg"
                      onClick={refresh}
                      disabled={isRefreshing}
                      className="rounded-md"
                      aria-label={
                        isRefreshing
                          ? "Refreshing data"
                          : "Refresh banking data"
                      }
                    >
                      <IconRefresh
                        className={isRefreshing ? "animate-spin" : ""}
                      />
                    </Button>
                  </HeaderActionTooltip>

                  <span
                    className="mx-0.5 h-4 w-px bg-border"
                    aria-hidden="true"
                  />

                  <HeaderActionTooltip
                    label={
                      resolvedTheme === "dark"
                        ? "Switch to light mode"
                        : "Switch to dark mode"
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() =>
                        setTheme(resolvedTheme === "dark" ? "light" : "dark")
                      }
                      aria-label="Toggle colour theme"
                      className="rounded-md"
                    >
                      {isThemeMounted && resolvedTheme === "dark" ? (
                        <IconSun />
                      ) : (
                        <IconMoon
                          className={isThemeMounted ? undefined : "opacity-0"}
                        />
                      )}
                    </Button>
                  </HeaderActionTooltip>
                  {!isChatOpen && (
                    <HeaderActionTooltip label="Open Nest assistant">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        onClick={openChat}
                        aria-label="Open Nest assistant"
                        aria-controls="finance-chat-panel"
                        className="rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]"
                      >
                        <IconSparkles />
                      </Button>
                    </HeaderActionTooltip>
                  )}
                </div>
              </TooltipProvider>
            </div>

            <nav
              className="flex items-center gap-1 overflow-x-auto border-t border-border px-3 py-1.5 sm:px-5 lg:hidden"
              aria-label="Primary navigation"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = item.view === view

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[0.65rem] font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="size-3.5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </header>
        )}

        {isDashboardView && <DashboardViewControls />}

        <div
          className={
            isDashboardView
              ? "w-full p-2 sm:p-3"
              : "w-full px-3 py-5 sm:px-5 sm:py-6 lg:px-6"
          }
        >
          {(warnings.length > 0 || refreshError) && (
            <div className="mb-4 rounded-md border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              {refreshError
                ? `Data refresh failed: ${refreshError}`
                : `Some live data is temporarily unavailable: ${warnings.join(" · ")}`}
            </div>
          )}

          {view === "settings" ? (
            <SettingsPanel
              snapshot={snapshot}
              preferences={preferences}
              budgets={activeBudgets}
              categories={budgetCategories}
              onBudgetsSaved={setActiveBudgets}
              isRefreshing={isRefreshing}
              refreshError={refreshError}
              onRefresh={refresh}
            />
          ) : view === "activity" ? (
            <ActivityDataTable snapshot={snapshot} preferences={preferences} />
          ) : view === "net-worth" && netWorthProfile ? (
            <NetWorthDashboard
              snapshot={snapshot}
              preferences={preferences}
              initialProfile={netWorthProfile}
            />
          ) : view === "forecast" ? (
            <ForecastCalculator snapshot={snapshot} />
          ) : (
            <>
              <section id="overview" className="scroll-mt-28 lg:scroll-mt-20">
                {!isDashboardView && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                        Overview
                      </h1>
                      <p className="mt-1 text-xs text-pretty text-muted-foreground">
                        Your property loan, offset and spending in one place.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDateKey(todayKey, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="hidden h-8 rounded-md sm:inline-flex"
                        onClick={openDashboardView}
                      >
                        <IconPresentationAnalytics />
                        Dashboard view
                      </Button>
                    </div>
                  </div>
                )}

                <div
                  className={`grid gap-3 xl:grid-cols-3 ${
                    isDashboardView ? "" : "mt-4"
                  }`}
                >
                  <OffsetGauge
                    offsetBalance={offsetBalance}
                    loanBalance={loanBalance}
                    expectedNextBalance={expectedNextOffsetBalance}
                    monthlyTakeHomeIncome={monthlyTakeHomeIncome}
                    monthlyPayment={monthlyPayment}
                    expectedMonthlyExpenses={expectedMonthlyExpenses}
                  />

                  <article className="flex min-h-80 flex-col rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total expenses
                        </p>
                        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-balance tabular-nums">
                          {formatMoney(monthSpendTotal, true)}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {monthSpend.length} transactions this month
                        </p>
                      </div>
                      <BudgetDialog
                        budgets={activeBudgets}
                        categories={budgetCategories}
                        compact
                        onSaved={setActiveBudgets}
                      />
                    </div>

                    <div className="mt-4 rounded-xl bg-muted p-3">
                      <p className="text-[0.62rem] font-semibold tracking-wide text-muted-foreground uppercase">
                        Overview
                      </p>
                      <div className="mt-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Spend to date
                          </span>
                          <span className="font-semibold tabular-nums">
                            {formatMoney(monthSpendTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Monthly budget
                          </span>
                          <span className="font-semibold tabular-nums">
                            {activeBudgets.total
                              ? formatMoney(activeBudgets.total)
                              : "Not set"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Remaining
                          </span>
                          <span
                            className={`font-semibold tabular-nums ${
                              activeBudgets.total &&
                              activeBudgets.total - monthSpendTotal < 0
                                ? "text-destructive"
                                : ""
                            }`}
                          >
                            {activeBudgets.total
                              ? formatMoney(
                                  activeBudgets.total - monthSpendTotal
                                )
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Projected month
                          </span>
                          <span className="font-semibold tabular-nums">
                            {formatMoney(projectedSpend)}
                          </span>
                        </div>
                        {activeBudgets.total && (
                          <div className="h-1.5 overflow-hidden rounded-full bg-background">
                            <div
                              className={`h-full rounded-full ${
                                monthSpendTotal > activeBudgets.total
                                  ? "bg-destructive"
                                  : "bg-primary"
                              }`}
                              style={{ width: `${totalBudgetProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-muted p-3">
                      <p className="text-[0.62rem] font-semibold tracking-wide text-muted-foreground uppercase">
                        Recent transactions
                      </p>
                      <div className="mt-2 space-y-2">
                        {recentExpenseTransactions.length > 0 ? (
                          recentExpenseTransactions.map((transaction) => {
                            const transactionDateTime =
                              formatTransactionDateTime(
                                transaction,
                                snapshot.timezone
                              )

                            return (
                              <div
                                key={transaction.id}
                                className="border-t border-border pt-1 first:border-0 first:pt-0"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedOverviewTransaction(transaction)
                                  }
                                  className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-1 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-background/70 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.96]"
                                  aria-label={`View details for ${getMerchantName(
                                    transaction
                                  )}`}
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <MerchantLogo
                                      name={getMerchantName(transaction)}
                                      category={transaction.provider_category}
                                      src={transaction.custom_logo}
                                      className="size-7 rounded-md"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-medium">
                                        {getMerchantName(transaction)}
                                      </p>
                                      <p className="mt-0.5 text-[0.62rem] text-muted-foreground tabular-nums">
                                        {transactionDateTime.date}
                                        {transactionDateTime.time && (
                                          <>
                                            <span aria-hidden="true"> · </span>
                                            {transactionDateTime.time}
                                          </>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-mono text-xs font-semibold tabular-nums">
                                    {formatMoney(transaction.amount?.amount)}
                                  </span>
                                </button>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No expenses recorded this month.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>

                  <article className="flex min-h-80 flex-col overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="p-5">
                      <p className="text-xs text-muted-foreground">
                        Effective property debt
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                        {formatMoney(effectiveLoan, true)}
                      </p>
                      <div className="mt-4 flex gap-1">
                        <div className="h-1.5 flex-1 rounded-full bg-primary" />
                        <div
                          className="h-1.5 min-w-2 rounded-full bg-muted"
                          style={{
                            width: `${Math.max(2, Math.min(100, offsetCoverage))}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {formatMoney(loanBalance, true)} loan
                        </span>
                        <span className="font-medium text-primary">
                          {formatMoney(offsetBalance, true)} offset
                        </span>
                      </div>

                      <div className="mt-4 border-t border-border pt-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[0.62rem] font-semibold tracking-wide text-muted-foreground uppercase">
                              12-month debt outlook
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Projected effective debt{" "}
                              <span className="font-medium text-foreground tabular-nums">
                                {formatMoney(projectedEffectiveDebt, true)}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[0.62rem] text-muted-foreground">
                              Reduction
                            </p>
                            <p className="mt-0.5 font-mono text-xs font-semibold text-primary tabular-nums">
                              {formatMoney(projectedDebtReduction, true)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1">
                          <DebtOutlookChart data={debtOutlook} />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[0.55rem] text-muted-foreground">
                          <span>{debtOutlook[0]?.label}</span>
                          <span>{debtOutlook.at(-1)?.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-border p-5">
                      <p className="text-xs text-muted-foreground">
                        Next repayment
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                        {formatMoney(monthlyPayment, true)}
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {loanDetails?.next_instalment_date
                              ? `Due ${formatDateKey(
                                  loanDetails.next_instalment_date,
                                  {
                                    day: "numeric",
                                    month: "long",
                                  }
                                )}`
                              : "Monthly principal & interest"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.62rem] text-muted-foreground">
                            Est. payoff
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums">
                            {formatDuration(projection?.months)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <section
                id="spending"
                className="mt-3 scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card lg:scroll-mt-20"
              >
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[0.62rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                      Everyday spending
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                        {formatMoney(sumTransactions(rangeSpend), true)}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        across {rangeSpend.length} transactions
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BudgetDialog
                      budgets={activeBudgets}
                      categories={budgetCategories}
                      onSaved={setActiveBudgets}
                    />
                    <div className="flex rounded-md border border-border bg-muted p-0.5">
                      {(["7d", "30d", "120d"] as TimeRange[]).map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => {
                            setTimeRange(range)
                            setSelectedSpendCategory("all")
                          }}
                          className={`h-7 rounded-sm px-2.5 text-[0.65rem] font-semibold tracking-wide transition-colors ${
                            timeRange === range
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {range.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-b border-border px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[0.62rem] font-semibold text-muted-foreground">
                        {monthLabelForDashboard(activeBudgets.month)} budget
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">
                        {formatMoney(monthSpendTotal)}
                        <span className="font-normal text-muted-foreground">
                          {activeBudgets.total
                            ? ` of ${formatMoney(activeBudgets.total)}`
                            : " · No total budget set"}
                        </span>
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[0.62rem] text-muted-foreground">
                        {activeBudgets.total ? "Remaining" : "Projected month"}
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-semibold tabular-nums ${
                          activeBudgets.total &&
                          monthSpendTotal > activeBudgets.total
                            ? "text-destructive"
                            : ""
                        }`}
                      >
                        {activeBudgets.total
                          ? formatMoney(activeBudgets.total - monthSpendTotal)
                          : formatMoney(projectedSpend)}
                      </p>
                    </div>
                  </div>
                  {activeBudgets.total && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          monthSpendTotal > activeBudgets.total
                            ? "bg-destructive"
                            : "bg-primary"
                        }`}
                        style={{ width: `${totalBudgetProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
                  <div className="min-w-0 p-3 sm:p-4 lg:border-r lg:border-border">
                    <div
                      className="mb-3 flex gap-1.5 overflow-x-auto pb-1"
                      aria-label="Spending category chart filters"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSpendCategory("all")}
                        aria-pressed={activeSpendCategory === "all"}
                        className={`h-7 shrink-0 rounded-md border px-2.5 text-[0.62rem] font-semibold transition-colors ${
                          activeSpendCategory === "all"
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All spending
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.category}
                          type="button"
                          onClick={() =>
                            setSelectedSpendCategory(category.category)
                          }
                          aria-pressed={
                            activeSpendCategory === category.category
                          }
                          className={`flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[0.62rem] font-semibold transition-colors ${
                            activeSpendCategory === category.category
                              ? "border-foreground bg-muted text-foreground"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${category.colour}`}
                          />
                          {category.label}
                        </button>
                      ))}
                    </div>
                    <DailySpendChart
                      data={chartData}
                      categories={categories}
                      selectedCategory={activeSpendCategory}
                    />
                  </div>
                  <div className="border-t border-border p-4 lg:border-t-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold">Where it went</h3>
                      <span className="font-mono text-[0.6rem] text-muted-foreground">
                        {timeRange.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {categories.length > 0 ? (
                        categories.map((category) => {
                          const categoryBudget =
                            category.category === OTHER_CATEGORY
                              ? null
                              : (activeBudgets.categories[category.category] ??
                                null)
                          const categoryMonthSpend =
                            monthSpendByCategory.get(category.category) ?? 0
                          const categoryProgress = categoryBudget
                            ? Math.min(
                                100,
                                Math.round(
                                  (categoryMonthSpend / categoryBudget) * 100
                                )
                              )
                            : category.percentage

                          return (
                            <button
                              key={category.category}
                              type="button"
                              onClick={() =>
                                setSelectedSpendCategory(category.category)
                              }
                              aria-pressed={
                                activeSpendCategory === category.category
                              }
                              className="block w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-4"
                            >
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span
                                    className={`size-2 shrink-0 rounded-full ${category.colour}`}
                                  />
                                  <span className="truncate">
                                    {category.label}
                                  </span>
                                </div>
                                <span className="font-mono text-[0.68rem] font-medium tabular-nums">
                                  {formatMoney(category.amount)}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-3 text-[0.58rem] text-muted-foreground">
                                <span>Month to date</span>
                                <span className="font-mono tabular-nums">
                                  {formatMoney(categoryMonthSpend)}
                                  {categoryBudget
                                    ? ` / ${formatMoney(categoryBudget)}`
                                    : " · No limit"}
                                </span>
                              </div>
                              <div className="mt-1.5 h-px bg-border">
                                <div
                                  className={`h-px ${
                                    categoryBudget &&
                                    categoryMonthSpend > categoryBudget
                                      ? "bg-destructive"
                                      : category.colour
                                  }`}
                                  style={{ width: `${categoryProgress}%` }}
                                />
                              </div>
                            </button>
                          )
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No categories to show yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {!isDashboardView && loanAccount && (
                <section
                  id="property-loan"
                  className="mt-3 scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground lg:scroll-mt-20"
                >
                  <div className="grid xl:grid-cols-[minmax(0,0.9fr)_minmax(500px,1.1fr)]">
                    <div className="p-4 sm:p-5 xl:border-r xl:border-border xl:p-6">
                      <div className="flex items-center justify-between">
                        <p className="text-[0.62rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                          Property loan runway
                        </p>
                        <Badge variant="secondary">
                          {annualRate > 0
                            ? `${(annualRate * 100).toFixed(2)}% variable`
                            : "Live"}
                        </Badge>
                      </div>
                      <p className="mt-6 text-xs text-muted-foreground">
                        Estimated time to pay off
                      </p>
                      <h2 className="mt-2 text-3xl leading-none font-semibold tracking-tight text-balance sm:text-4xl">
                        {formatDuration(projection?.months)}
                      </h2>
                      <p className="mt-2 max-w-md text-xs leading-relaxed text-pretty text-muted-foreground">
                        At the current minimum repayment, assuming your rate and
                        offset balance stay unchanged.
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border pt-4">
                        <div>
                          <p className="text-[0.65rem] text-muted-foreground">
                            Estimated payoff
                          </p>
                          <p className="mt-1 font-mono text-xs font-semibold tabular-nums">
                            {projection
                              ? new Intl.DateTimeFormat("en-AU", {
                                  month: "long",
                                  year: "numeric",
                                }).format(new Date(projection.payoffDate))
                              : "Not available"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[0.65rem] text-muted-foreground">
                            Contract end
                          </p>
                          <p className="mt-1 font-mono text-xs font-semibold tabular-nums">
                            {loanDetails?.loan_end_date
                              ? formatDateKey(loanDetails.loan_end_date, {
                                  month: "long",
                                  year: "numeric",
                                })
                              : formatDuration(contractualMonths)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[0.65rem] text-muted-foreground">
                            Time saved by offset
                          </p>
                          <p className="mt-1 font-mono text-xs font-semibold tabular-nums">
                            {monthsSaved > 0
                              ? formatDuration(monthsSaved)
                              : "Build your offset"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[0.65rem] text-muted-foreground">
                            Est. interest saved
                          </p>
                          <p className="mt-1 font-mono text-xs font-semibold tabular-nums">
                            {formatMoney(interestSaved, true)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-md bg-muted p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Offset coverage
                          </span>
                          <span className="font-mono">
                            {offsetCoverage.toFixed(2)}%
                          </span>
                        </div>
                        <Progress
                          value={Math.max(
                            offsetCoverage,
                            offsetCoverage > 0 ? 1.5 : 0
                          )}
                          className="mt-2 h-1.5"
                        />
                        <div className="mt-2 flex justify-between text-[0.62rem] text-muted-foreground">
                          <span>{formatMoney(offsetBalance, true)} offset</span>
                          <span>{formatMoney(loanBalance, true)} loan</span>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 border-t border-border p-4 sm:p-5 xl:border-t-0 xl:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Projected balance
                          </p>
                          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                            {formatMoney(loanBalance, true)}
                          </p>
                        </div>
                        <IconTargetArrow className="size-7 text-muted-foreground" />
                      </div>
                      <div className="mt-3">
                        {payoffSeries.length > 1 ? (
                          <PayoffChart data={payoffSeries} />
                        ) : (
                          <div className="grid h-[210px] place-items-center text-xs text-muted-foreground">
                            Payoff forecast will appear when loan details are
                            available.
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                        <span className="size-2 rounded-full bg-foreground" />
                        Minimum repayment · {formatMoney(
                          monthlyPayment,
                          true
                        )}{" "}
                        monthly
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {!isDashboardView && (
                <section
                  id="accounts"
                  className="mt-3 scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card lg:scroll-mt-20"
                >
                  <div className="flex items-end justify-between border-b border-border px-4 py-3">
                    <div>
                      <p className="text-[0.62rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                        Accounts
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                        Property loan and offset.
                      </h2>
                    </div>
                    <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                      <InstitutionLogo
                        name={
                          snapshot.accounts[0]?.account.institution.name ??
                          "Bank of Melbourne"
                        }
                        src={
                          snapshot.accounts[0]?.account.institution.logo ?? null
                        }
                        className="size-10 rounded-lg"
                      />
                      {snapshot.accounts[0]?.account.institution.name}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 md:divide-x md:divide-border">
                    {snapshot.accounts.map((account) => (
                      <AccountPanel
                        key={account.account.id}
                        account={account}
                        preference={preferences.accounts[account.account.id]}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <TransactionDetailsSheet
          key={
            selectedOverviewTransaction?.id ??
            "closed-overview-transaction-details"
          }
          transaction={selectedOverviewTransaction}
          account={selectedOverviewAccount}
          accountName={
            selectedOverviewAccount
              ? (selectedOverviewAccountPreference?.displayName ??
                selectedOverviewAccount.name)
              : "Account"
          }
          institutionName={
            selectedOverviewAccount
              ? (selectedOverviewAccountPreference?.institutionName ??
                selectedOverviewAccount.institution.name)
              : "Bank of Melbourne"
          }
          institutionLogo={
            selectedOverviewAccount
              ? (selectedOverviewAccountPreference?.institutionLogo ??
                selectedOverviewAccount.institution.logo)
              : null
          }
          timezone={snapshot.timezone}
          onOpenChange={(open) => {
            if (!open) setSelectedOverviewTransaction(null)
          }}
          onTransactionChange={setSelectedOverviewTransaction}
        />
      </main>
    </>
  )
}

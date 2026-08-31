"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import {
  IconAdjustmentsDollar,
  IconBuildingBank,
  IconBuildingEstate,
  IconCheck,
  IconDatabase,
  IconDeviceDesktop,
  IconMoon,
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconSun,
} from "@tabler/icons-react"

import { AccountNameDialog } from "@/components/account-name-dialog"
import {
  BudgetDialog,
  type BudgetCategoryOption,
} from "@/components/budget-dialog"
import { InstitutionLogo } from "@/components/institution-logo"
import { HouseholdIncomeManager } from "@/components/household-income-manager"
import { PropertyAccountsManager } from "@/components/property-accounts-manager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatMoney } from "@/lib/finance"
import type {
  DashboardPreferences,
  MonthlyBudgets,
} from "@/lib/preferences-types"
import type { FinancialSnapshot } from "@/lib/redbark-types"

const SETTINGS_SECTIONS = [
  {
    id: "general",
    label: "General",
    description: "Household and appearance",
    icon: IconSettings,
  },
  {
    id: "properties",
    label: "Properties",
    description: "Homes and mortgages",
    icon: IconBuildingEstate,
  },
  {
    id: "accounts",
    label: "Accounts",
    description: "Names and connections",
    icon: IconBuildingBank,
  },
  {
    id: "budgets",
    label: "Budgets",
    description: "Monthly spending limits",
    icon: IconAdjustmentsDollar,
  },
  {
    id: "data",
    label: "Data & assistant",
    description: "Sync and local workspace",
    icon: IconDatabase,
  },
] as const

type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["id"]

const subscribeToNothing = () => () => {}
const getMountedSnapshot = () => true
const getServerMountedSnapshot = () => false

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`))
}

function GeneralSettings({
  preferences,
}: {
  preferences: DashboardPreferences
}) {
  const { theme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    subscribeToNothing,
    getMountedSnapshot,
    getServerMountedSnapshot
  )
  const themeOptions = [
    { value: "system", label: "System", icon: IconDeviceDesktop },
    { value: "light", label: "Light", icon: IconSun },
    { value: "dark", label: "Dark", icon: IconMoon },
  ] as const

  return (
    <div className="space-y-3">
      <HouseholdIncomeManager initialHousehold={preferences.household} />
      <Card size="sm">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how the household workspace appears on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {themeOptions.map((option) => {
              const selected = mounted && theme === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={selected}
                  className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-left text-xs font-medium ring-1 transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-[0.96] ${
                    selected
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-background text-muted-foreground ring-foreground/10 hover:bg-muted hover:text-foreground hover:ring-foreground/15"
                  }`}
                >
                  <option.icon className="size-4" />
                  <span>{option.label}</span>
                  {selected ? <IconCheck className="ml-auto size-3.5" /> : null}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AccountSettings({
  snapshot,
  preferences,
}: {
  snapshot: FinancialSnapshot
  preferences: DashboardPreferences
}) {
  const [accountNames, setAccountNames] = React.useState(() =>
    Object.fromEntries(
      snapshot.accounts.map(({ account }) => [
        account.id,
        preferences.accounts[account.id]?.displayName ?? account.name,
      ])
    )
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>
          Rename accounts in Nest without changing their bank-side details.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">{snapshot.accounts.length} connected</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border rounded-lg bg-muted/45 px-3">
          {snapshot.accounts.map(({ account, balance }) => {
            const preference = preferences.accounts[account.id]
            const displayName = accountNames[account.id] ?? account.name
            const institutionName =
              preference?.institutionName ?? account.institution.name
            const institutionLogo =
              preference?.institutionLogo ?? account.institution.logo

            return (
              <div
                key={account.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <InstitutionLogo
                    name={institutionName}
                    src={institutionLogo}
                    className="size-11 rounded-md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold">
                        {displayName}
                      </p>
                      <Badge variant="secondary" className="capitalize">
                        {account.type}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[0.65rem] text-muted-foreground">
                      {institutionName}
                      {account.account_number
                        ? ` · •••• ${account.account_number.slice(-4)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pl-14 sm:justify-end sm:pl-0">
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-xs font-semibold tabular-nums">
                      {formatMoney(
                        Math.abs(balance?.current?.amount ?? 0),
                        true
                      )}
                    </p>
                    <p className="mt-0.5 text-[0.6rem] text-muted-foreground uppercase">
                      {account.currency || balance?.currency || "AUD"}
                    </p>
                  </div>
                  <AccountNameDialog
                    accountId={account.id}
                    displayName={displayName}
                    providerName={preference?.providerName ?? account.name}
                    institutionName={institutionName}
                    onSaved={(name) =>
                      setAccountNames((current) => ({
                        ...current,
                        [account.id]: name,
                      }))
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function BudgetSettings({
  budgets,
  categories,
  onSaved,
}: {
  budgets: MonthlyBudgets
  categories: BudgetCategoryOption[]
  onSaved: (budgets: MonthlyBudgets) => void
}) {
  const spend = categories.reduce(
    (total, category) => total + category.spent,
    0
  )
  const totalProgress = budgets.total
    ? Math.min(100, Math.round((spend / budgets.total) * 100))
    : 0

  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{monthLabel(budgets.month)} budget</CardTitle>
          <CardDescription>
            Overall and category limits for everyday spending.
          </CardDescription>
          <CardAction>
            <BudgetDialog
              budgets={budgets}
              categories={categories}
              onSaved={onSaved}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/45 p-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.65rem] text-muted-foreground">
                  Spent this month
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {formatMoney(spend, true)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.65rem] text-muted-foreground">
                  Monthly limit
                </p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                  {budgets.total ? formatMoney(budgets.total, true) : "Not set"}
                </p>
              </div>
            </div>
            {budgets.total ? (
              <Progress className="mt-3 h-1.5" value={totalProgress} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Category limits</CardTitle>
          <CardDescription>
            Compare this month’s spending with each saved limit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {categories.length > 0 ? (
              categories.map((category) => {
                const limit = budgets.categories[category.category]
                const progress = limit
                  ? Math.min(100, Math.round((category.spent / limit) * 100))
                  : 0

                return (
                  <div
                    key={category.category}
                    className="py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-medium">{category.label}</p>
                      <p className="font-mono text-[0.65rem] tabular-nums">
                        {formatMoney(category.spent)}
                        <span className="text-muted-foreground">
                          {limit ? ` of ${formatMoney(limit)}` : " · No limit"}
                        </span>
                      </p>
                    </div>
                    {limit ? (
                      <Progress className="mt-2" value={progress} />
                    ) : null}
                  </div>
                )
              })
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Categories will appear after spending is synchronised.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DataSettings({
  snapshot,
  isRefreshing,
  refreshError,
  onRefresh,
}: {
  snapshot: FinancialSnapshot
  isRefreshing: boolean
  refreshError: string | null
  onRefresh: () => void
}) {
  const refreshedAt = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: snapshot.timezone,
  }).format(new Date(snapshot.fetchedAt))

  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Banking data</CardTitle>
          <CardDescription>
            Nest reads normal page views from the local database.
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]"
            >
              <IconRefresh className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Refreshing" : "Refresh now"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-lg bg-muted/45 px-3">
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-xs text-muted-foreground">
                Last refresh
              </span>
              <span className="font-mono text-[0.68rem] font-medium tabular-nums">
                {refreshedAt}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-xs text-muted-foreground">API version</span>
              <span className="font-mono text-[0.68rem] font-medium">
                {snapshot.apiVersion}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-xs text-muted-foreground">
                Cached accounts
              </span>
              <Badge variant="secondary">{snapshot.accounts.length}</Badge>
            </div>
          </div>
          {refreshError ? (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-[0.65rem] text-destructive">
              {refreshError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
              <IconSparkles className="size-3.5" />
            </span>
            <CardTitle>Nest assistant</CardTitle>
          </div>
          <CardDescription>
            Conversations stay in this browser and answers use the household
            data cached by Nest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/45 px-3 py-3">
            <div>
              <p className="text-xs font-medium">Workspace access</p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                Financial tools are available without write access.
              </p>
            </div>
            <Badge variant="outline">Read only</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPanel({
  snapshot,
  preferences,
  budgets,
  categories,
  onBudgetsSaved,
  isRefreshing,
  refreshError,
  onRefresh,
}: {
  snapshot: FinancialSnapshot
  preferences: DashboardPreferences
  budgets: MonthlyBudgets
  categories: BudgetCategoryOption[]
  onBudgetsSaved: (budgets: MonthlyBudgets) => void
  isRefreshing: boolean
  refreshError: string | null
  onRefresh: () => void
}) {
  const searchParams = useSearchParams()
  const requestedSection = searchParams.get("section")
  const initialSection = SETTINGS_SECTIONS.some(
    (section) => section.id === requestedSection
  )
    ? (requestedSection as SettingsSection)
    : "general"
  const [activeSection, setActiveSection] =
    React.useState<SettingsSection>(initialSection)

  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="border-b border-border px-4 py-3.5">
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          Settings
        </h1>
        <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
          Manage your household workspace, accounts, budgets and data.
        </p>
      </div>

      <div className="flex min-h-[calc(100svh-9.5rem)] flex-col md:flex-row">
        <aside className="shrink-0 border-b border-border p-2 md:w-52 md:border-r md:border-b-0 md:p-3">
          <nav
            className="flex gap-1 overflow-x-auto md:flex-col"
            aria-label="Settings sections"
          >
            {SETTINGS_SECTIONS.map((section) => {
              const active = activeSection === section.id

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] md:w-full ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  <section.icon className="size-3.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[0.68rem] font-semibold">
                      {section.label}
                    </span>
                    <span className="mt-0.5 hidden truncate text-[0.58rem] opacity-70 md:block">
                      {section.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 p-3 sm:p-4 lg:p-5">
          {activeSection === "general" ? (
            <GeneralSettings preferences={preferences} />
          ) : activeSection === "properties" ? (
            <PropertyAccountsManager
              snapshot={snapshot}
              preferences={preferences}
            />
          ) : activeSection === "accounts" ? (
            <AccountSettings snapshot={snapshot} preferences={preferences} />
          ) : activeSection === "budgets" ? (
            <BudgetSettings
              budgets={budgets}
              categories={categories}
              onSaved={onBudgetsSaved}
            />
          ) : (
            <DataSettings
              snapshot={snapshot}
              isRefreshing={isRefreshing}
              refreshError={refreshError}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </div>
    </section>
  )
}

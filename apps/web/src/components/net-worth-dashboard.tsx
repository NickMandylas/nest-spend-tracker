"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconArrowUpRight,
  IconBuildingBank,
  IconBuildingEstate,
  IconCalendarStats,
  IconEdit,
  IconHomeDollar,
  IconInfoCircle,
  IconLink,
  IconLoader2,
  IconPigMoney,
  IconScale,
  IconShieldCheck,
  IconWallet,
} from "@tabler/icons-react"

import { updateNetWorthProfile } from "@/app/actions/net-worth"
import { InstitutionLogo } from "@/components/institution-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { formatCompactMoney, formatMoney } from "@/lib/finance"
import type { NetWorthProfile } from "@/lib/net-worth-types"
import type { DashboardPreferences } from "@/lib/preferences-types"
import type { FinancialSnapshot } from "@/lib/redbark-types"

const MARKET_SCENARIOS = [
  {
    label: "Conservative",
    rate: 0.029,
    note: "2026 year-to-date house movement",
    source: "Heatmaps",
    href: "https://heatmaps.com.au/suburbs/vic/south-melbourne-3205/",
  },
  {
    label: "Current pace",
    rate: 0.048,
    note: "All houses, latest 12 months",
    source: "realestate.com.au",
    href: "https://www.realestate.com.au/vic/south-melbourne-3205/",
  },
  {
    label: "Strong market",
    rate: 0.108,
    note: "Three-bedroom houses, latest 12 months",
    source: "realestate.com.au",
    href: "https://www.realestate.com.au/property/351-moray-st-south-melbourne-vic-3205/",
  },
] as const

function amountValue(amountMinor: number) {
  return (amountMinor / 100).toFixed(2)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`
}

function formatValuationDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  children,
}: {
  label: string
  value: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  children?: React.ReactNode
}) {
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-[0.68rem] text-muted-foreground">{detail}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      {children}
    </article>
  )
}

function MoneyInput({
  id,
  name,
  label,
  defaultValue,
  hint,
}: {
  id: string
  name: string
  label: string
  defaultValue: number
  hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {hint && (
          <span className="text-[0.62rem] text-muted-foreground">{hint}</span>
        )}
      </div>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          name={name}
          type="number"
          min="0"
          max="1000000000"
          step="0.01"
          inputMode="decimal"
          defaultValue={amountValue(defaultValue)}
          className="h-9 pl-7 font-mono tabular-nums"
          required
        />
      </div>
    </div>
  )
}

function NetWorthSettingsDialog({
  profile,
  propertyLoanBalanceMinor,
  propertyLoanInstitutionName,
  propertyLoanAccountNumber,
  onSaved,
}: {
  profile: NetWorthProfile
  propertyLoanBalanceMinor: number
  propertyLoanInstitutionName: string
  propertyLoanAccountNumber: string | null
  onSaved: (profile: NetWorthProfile) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const superAccounts = profile.items.filter(
    (item) => item.category === "superannuation" && item.itemType === "asset"
  )

  function save(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateNetWorthProfile(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }

      onSaved(result.profile)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="lg" className="h-8">
          <IconEdit />
          Edit assumptions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border p-4 pr-12">
          <DialogTitle>Net worth assumptions</DialogTitle>
          <DialogDescription>
            Property value and super are saved locally. The property loan
            updates from its connected bank account.
          </DialogDescription>
        </DialogHeader>

        <form action={save} className="flex min-h-0 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto p-4">
            <section>
              <p className="text-[0.62rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                {profile.property.displayName}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <MoneyInput
                  id="property-value"
                  name="propertyValue"
                  label="Current value"
                  defaultValue={profile.property.valueMinor}
                />
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label>Loan balance</Label>
                    <span className="inline-flex items-center gap-1 text-[0.62rem] font-medium text-primary">
                      <IconLink className="size-3" />
                      Linked
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-9 items-center rounded-md border border-border bg-muted px-3 font-mono text-sm font-medium tabular-nums">
                    {formatMoney(propertyLoanBalanceMinor)}
                  </div>
                  <p className="mt-1 text-[0.6rem] text-muted-foreground">
                    {propertyLoanInstitutionName}
                    {propertyLoanAccountNumber
                      ? ` · ${propertyLoanAccountNumber}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="property-valued-at">Valuation date</Label>
                <Input
                  id="property-valued-at"
                  name="propertyValuedAt"
                  type="date"
                  defaultValue={profile.property.valuedAt}
                  className="mt-1.5 h-9"
                  required
                />
              </div>
            </section>

            <section className="border-t border-border pt-5">
              <p className="text-[0.62rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Superannuation
              </p>
              <div className="mt-2 space-y-3">
                {superAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="grid gap-2 rounded-lg bg-muted p-3 sm:grid-cols-[1fr_0.8fr]"
                  >
                    <div>
                      <Label htmlFor={`super-name-${account.id}`}>Name</Label>
                      <Input
                        id={`super-name-${account.id}`}
                        name={`superName:${account.id}`}
                        defaultValue={account.displayName}
                        maxLength={80}
                        className="mt-1.5 h-9"
                        required
                      />
                    </div>
                    <MoneyInput
                      id={`super-balance-${account.id}`}
                      name={`superBalance:${account.id}`}
                      label="Current balance"
                      defaultValue={account.amountMinor}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MoneyInput
                  id="monthly-super-contribution"
                  name="monthlySuperContribution"
                  label="Gross monthly contribution"
                  defaultValue={profile.settings.monthlySuperContributionMinor}
                  hint="Combined"
                />
                <div>
                  <Label htmlFor="super-tax-rate">Contribution tax</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="super-tax-rate"
                      name="superContributionTaxPercent"
                      type="number"
                      min="0"
                      max="45"
                      step="0.01"
                      defaultValue={(
                        profile.settings.superContributionTaxBps / 100
                      ).toFixed(2)}
                      className="h-9 pr-7 font-mono tabular-nums"
                      required
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="border-t border-border p-4">
            <p
              className="mb-2 min-h-4 text-[0.65rem] text-destructive"
              aria-live="polite"
            >
              {error}
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="lg">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="lg" disabled={isPending}>
                {isPending && <IconLoader2 className="animate-spin" />}
                {isPending ? "Saving" : "Save net worth"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function NetWorthDashboard({
  snapshot,
  preferences,
  initialProfile,
}: {
  snapshot: FinancialSnapshot
  preferences: DashboardPreferences
  initialProfile: NetWorthProfile
}) {
  const [profile, setProfile] = React.useState(initialProfile)
  const isDemoProfile = profile.property.id === "property_demo"
  const propertyFacts = isDemoProfile
    ? [
        ["3", "Beds"],
        ["2", "Baths"],
        ["1", "Car"],
        ["Demo", "Profile"],
      ]
    : [
        ["3", "Beds"],
        ["1", "Bath"],
        ["2", "Cars"],
        ["171m²", "Land"],
      ]

  const propertyLoanAccount =
    snapshot.accounts.find(
      ({ account }) =>
        account.type === "loan" &&
        preferences.accounts[account.id]?.propertyId === profile.property.id
    ) ??
    snapshot.accounts.find(
      ({ account }) =>
        account.type === "loan" &&
        account.institution.name.toLowerCase() === "bank of melbourne"
    )
  const linkedLoanAmount = propertyLoanAccount?.balance?.current?.amount
  const propertyLoanBalanceMinor =
    typeof linkedLoanAmount === "number" ? Math.abs(linkedLoanAmount) : null
  const propertyLoanInstitutionName =
    propertyLoanAccount?.account.institution.name ?? "Bank of Melbourne"

  if (propertyLoanBalanceMinor === null) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Net Worth
          </h1>
          <p className="mt-1 text-xs text-pretty text-muted-foreground">
            Property equity, cash and retirement savings minus liabilities.
          </p>
        </div>
        <article
          className="flex gap-3 rounded-xl border border-border bg-card p-4 sm:p-5"
          role="alert"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <IconBuildingBank className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Loan balance unavailable</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Refresh banking data to reconnect the Bank of Melbourne property
              loan before calculating net worth.
            </p>
          </div>
        </article>
      </div>
    )
  }

  const bankAssets = snapshot.accounts
    .filter(({ account, balance }) => {
      const current = balance?.current?.amount ?? 0
      return account.type !== "loan" && current > 0
    })
    .map(({ account, balance }) => ({
      id: account.id,
      name:
        preferences.accounts[account.id]?.displayName ??
        (account.name.toLowerCase().includes("offset")
          ? "Offset account"
          : account.name),
      institutionName: account.institution.name,
      institutionLogo: account.institution.logo,
      amountMinor: Math.max(0, balance?.current?.amount ?? 0),
    }))

  const manualAssets = profile.items.filter((item) => item.itemType === "asset")
  const manualLiabilities = profile.items.filter(
    (item) => item.itemType === "liability"
  )
  const bankAssetTotal = sum(bankAssets.map((asset) => asset.amountMinor))
  const manualAssetTotal = sum(manualAssets.map((asset) => asset.amountMinor))
  const manualLiabilityTotal = sum(
    manualLiabilities.map((liability) => liability.amountMinor)
  )
  const totalAssets =
    profile.property.valueMinor + bankAssetTotal + manualAssetTotal
  const totalLiabilities = propertyLoanBalanceMinor + manualLiabilityTotal
  const netWorth = totalAssets - totalLiabilities
  const propertyEquity = profile.property.valueMinor - propertyLoanBalanceMinor
  const ownershipPercent =
    profile.property.valueMinor > 0
      ? (Math.max(0, propertyEquity) / profile.property.valueMinor) * 100
      : 0
  const lvr =
    profile.property.valueMinor > 0
      ? (propertyLoanBalanceMinor / profile.property.valueMinor) * 100
      : 0
  const superAssets = manualAssets.filter(
    (item) => item.category === "superannuation"
  )
  const superTotal = sum(superAssets.map((item) => item.amountMinor))
  const monthlySuperTax = Math.round(
    (profile.settings.monthlySuperContributionMinor *
      profile.settings.superContributionTaxBps) /
      10_000
  )
  const netMonthlySuper =
    profile.settings.monthlySuperContributionMinor - monthlySuperTax
  const annualNetSuper = netMonthlySuper * 12
  const oneYearSuper = superTotal + annualNetSuper

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Net Worth
          </h1>
          <p className="mt-1 text-xs text-pretty text-muted-foreground">
            Property equity, cash and retirement savings minus liabilities.
          </p>
        </div>
        <NetWorthSettingsDialog
          profile={profile}
          propertyLoanBalanceMinor={propertyLoanBalanceMinor}
          propertyLoanInstitutionName={propertyLoanInstitutionName}
          propertyLoanAccountNumber={
            propertyLoanAccount?.account.account_number ?? null
          }
          onSaved={setProfile}
        />
      </div>

      <section
        className="grid gap-3 md:grid-cols-3"
        aria-label="Net worth summary"
      >
        <MetricCard
          label="Household net worth"
          value={formatMoney(netWorth, true)}
          detail={`${formatMoney(totalAssets, true)} assets · ${formatMoney(totalLiabilities, true)} liabilities`}
          icon={IconScale}
        >
          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className="bg-primary"
              style={{
                width: `${Math.max(0, Math.min(100, (netWorth / Math.max(1, totalAssets)) * 100))}%`,
              }}
            />
          </div>
        </MetricCard>
        <MetricCard
          label="Property equity"
          value={formatMoney(propertyEquity, true)}
          detail={`${formatPercent(ownershipPercent)} owned · ${formatPercent(lvr)} LVR`}
          icon={IconHomeDollar}
        >
          <Progress value={ownershipPercent} className="mt-4 h-1.5" />
        </MetricCard>
        <MetricCard
          label="Superannuation"
          value={formatMoney(superTotal, true)}
          detail={`${formatMoney(netMonthlySuper, true)} added monthly after tax`}
          icon={IconPigMoney}
        >
          <div className="mt-4 flex items-center justify-between text-[0.65rem]">
            <span className="text-muted-foreground">
              In 12 months, before returns
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {formatMoney(oneYearSuper, true)}
            </span>
          </div>
        </MetricCard>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Balance sheet</p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                Connected account balances plus manually maintained assets.
              </p>
            </div>
            <Badge variant="outline" className="font-mono tabular-nums">
              {formatMoney(netWorth, true)} net
            </Badge>
          </div>

          <div className="grid md:grid-cols-2">
            <div className="border-b border-border md:border-r md:border-b-0">
              <div className="flex items-center justify-between bg-muted/60 px-4 py-2.5">
                <span className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Assets
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {formatMoney(totalAssets, true)}
                </span>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <IconBuildingEstate className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {profile.property.displayName}
                    </p>
                    <p className="mt-0.5 text-[0.62rem] text-muted-foreground">
                      Residential property
                    </p>
                  </div>
                  <p className="font-mono text-xs font-semibold tabular-nums">
                    {formatMoney(profile.property.valueMinor, true)}
                  </p>
                </div>
                {bankAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <InstitutionLogo
                      name={asset.institutionName}
                      src={asset.institutionLogo}
                      className="size-9 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {asset.name}
                      </p>
                      <p className="mt-0.5 text-[0.62rem] text-muted-foreground">
                        {asset.institutionName} · cached balance
                      </p>
                    </div>
                    <p className="font-mono text-xs font-semibold tabular-nums">
                      {formatMoney(asset.amountMinor, true)}
                    </p>
                  </div>
                ))}
                {manualAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                      {asset.category === "superannuation" ? (
                        <IconPigMoney className="size-4" />
                      ) : (
                        <IconWallet className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {asset.displayName}
                      </p>
                      <p className="mt-0.5 text-[0.62rem] text-muted-foreground capitalize">
                        {asset.category}
                      </p>
                    </div>
                    <p className="font-mono text-xs font-semibold tabular-nums">
                      {formatMoney(asset.amountMinor, true)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between bg-muted/60 px-4 py-2.5">
                <span className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Liabilities
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {formatMoney(totalLiabilities, true)}
                </span>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center gap-3 px-4 py-3">
                  {propertyLoanAccount ? (
                    <InstitutionLogo
                      name={propertyLoanInstitutionName}
                      src={propertyLoanAccount.account.institution.logo}
                      className="size-9 rounded-lg"
                    />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <IconBuildingBank className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      Property loan
                    </p>
                    <p className="mt-0.5 text-[0.62rem] text-muted-foreground">
                      {propertyLoanInstitutionName} · linked balance
                    </p>
                  </div>
                  <p className="font-mono text-xs font-semibold tabular-nums">
                    {formatMoney(propertyLoanBalanceMinor, true)}
                  </p>
                </div>
                {manualLiabilities.map((liability) => (
                  <div
                    key={liability.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <IconWallet className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {liability.displayName}
                      </p>
                      <p className="mt-0.5 text-[0.62rem] text-muted-foreground capitalize">
                        {liability.category}
                      </p>
                    </div>
                    <p className="font-mono text-xs font-semibold tabular-nums">
                      {formatMoney(liability.amountMinor, true)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {profile.property.displayName}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                {profile.property.address}
              </p>
            </div>
            <Badge variant="outline">{profile.property.source}</Badge>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-muted p-3">
            <div>
              <p className="text-[0.6rem] text-muted-foreground">Value</p>
              <p className="mt-1 font-mono text-xs font-semibold tabular-nums">
                {formatCompactMoney(profile.property.valueMinor)}
              </p>
            </div>
            <div>
              <p className="text-[0.6rem] text-muted-foreground">Loan</p>
              <p className="mt-1 font-mono text-xs font-semibold tabular-nums">
                {formatCompactMoney(propertyLoanBalanceMinor)}
              </p>
            </div>
            <div>
              <p className="text-[0.6rem] text-muted-foreground">Equity</p>
              <p className="mt-1 font-mono text-xs font-semibold text-primary tabular-nums">
                {formatCompactMoney(propertyEquity)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[0.62rem]">
              <span className="text-muted-foreground">Owned equity</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatPercent(ownershipPercent)}
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <span
                className="bg-primary"
                style={{
                  width: `${Math.max(0, Math.min(100, ownershipPercent))}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 border-y border-border py-3 text-center">
            {propertyFacts.map(([value, label]) => (
              <div key={label}>
                <p className="font-mono text-xs font-semibold">{value}</p>
                <p className="mt-0.5 text-[0.58rem] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2 rounded-lg bg-primary/8 p-3 text-[0.66rem] leading-relaxed text-muted-foreground">
            <IconShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            {isDemoProfile ? (
              <p>
                This demonstration uses a fictional property and illustrative
                value. Replace these assumptions with private household data
                when running Nest locally.
              </p>
            ) : (
              <p>
                The $1.212m owner estimate sits within the April 2026
                selling-agent guide of $1.20m–$1.32m. The property is also
                covered by a heritage overlay, which can affect comparable-sale
                assumptions.
              </p>
            )}
          </div>

          <p className="mt-3 text-[0.6rem] text-muted-foreground">
            Valuation entered {formatValuationDate(profile.property.valuedAt)}.
          </p>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">
                {isDemoProfile
                  ? "Illustrative property scenarios"
                  : "South Melbourne scenarios"}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                One-year estimates applied to the{" "}
                {formatCompactMoney(profile.property.valueMinor)} baseline.
              </p>
            </div>
            <IconCalendarStats className="size-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {MARKET_SCENARIOS.map((scenario) => {
              const projectedValue = Math.round(
                profile.property.valueMinor * (1 + scenario.rate)
              )
              const projectedEquity = projectedValue - propertyLoanBalanceMinor

              return (
                <div
                  key={scenario.label}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{scenario.label}</p>
                      <Badge variant="secondary" className="font-mono">
                        +{formatPercent(scenario.rate * 100)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[0.62rem] text-muted-foreground">
                      {scenario.note} ·{" "}
                      <a
                        href={scenario.href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-border underline-offset-2 hover:text-foreground"
                      >
                        {scenario.source}
                      </a>
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[0.58rem] text-muted-foreground uppercase">
                      Projected value
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums">
                      {formatMoney(projectedValue, true)}
                    </p>
                  </div>
                  <div className="sm:w-28 sm:text-right">
                    <p className="text-[0.58rem] text-muted-foreground uppercase">
                      Equity
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-primary tabular-nums">
                      {formatMoney(projectedEquity, true)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 border-t border-border bg-muted/50 px-4 py-2.5 text-[0.62rem] leading-relaxed text-muted-foreground">
            <IconInfoCircle className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Market-wide growth is a scenario input, not a property valuation.
              {isDemoProfile
                ? " Actual outcomes can differ materially from these illustrative figures."
                : " Renovation potential, condition and the heritage overlay can create a material difference from suburb medians."}
            </p>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Super contribution flow</p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                Combined household amount, before investment returns.
              </p>
            </div>
            <IconPigMoney className="size-4 text-muted-foreground" />
          </div>

          <div className="mt-4 divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between py-2.5 text-xs">
              <span className="text-muted-foreground">Gross contribution</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatMoney(profile.settings.monthlySuperContributionMinor)}
                <span className="ml-1 font-sans text-[0.6rem] font-normal text-muted-foreground">
                  /mo
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-xs">
              <span className="text-muted-foreground">
                Contribution tax (
                {formatPercent(profile.settings.superContributionTaxBps / 100)})
              </span>
              <span className="font-mono font-semibold tabular-nums">
                −{formatMoney(monthlySuperTax)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 text-xs">
              <span className="font-medium">Net added to super</span>
              <span className="font-mono font-semibold text-primary tabular-nums">
                {formatMoney(netMonthlySuper)} /mo
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.65rem] text-muted-foreground">
                Net annual contributions
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatMoney(annualNetSuper, true)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[0.65rem] text-muted-foreground">
                Balance after 12 months
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatMoney(oneYearSuper, true)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-2 text-[0.62rem] leading-relaxed text-muted-foreground">
            <IconInfoCircle className="mt-0.5 size-3.5 shrink-0" />
            <p>
              $4,500 monthly is $54,000 combined annually. If split evenly, that
              is $27,000 each—below the current $30,000 concessional cap, before
              any other concessional contributions. Division 293 can add tax
              when an individual threshold is exceeded.
            </p>
          </div>
          <a
            href="https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/division-293-tax-on-concessional-contributions-by-high-income-earners"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[0.62rem] font-medium text-primary hover:underline"
          >
            Check ATO contribution tax guidance
            <IconArrowUpRight className="size-3" />
          </a>
        </article>
      </section>
    </div>
  )
}

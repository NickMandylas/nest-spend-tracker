"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconBuildingBank,
  IconBuildingEstate,
  IconCalendarStats,
  IconEdit,
  IconHomeDollar,
  IconInfoCircle,
  IconLink,
  IconLoader2,
  IconMapPin,
  IconPigMoney,
  IconScale,
  IconSettings,
  IconUnlink,
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
import type {
  DashboardPreferences,
  PropertyPreference,
} from "@/lib/preferences-types"
import type { AccountSnapshot, FinancialSnapshot } from "@/lib/redbark-types"

function amountValue(amountMinor: number) {
  return (amountMinor / 100).toFixed(2)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`
}

function formatDate(date: string | null) {
  if (!date) return "Not dated"
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
        {hint ? (
          <span className="text-[0.62rem] text-muted-foreground">{hint}</span>
        ) : null}
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
  onSaved,
}: {
  profile: NetWorthProfile
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
          Edit super
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border p-4 pr-12">
          <DialogTitle>Super assumptions</DialogTitle>
          <DialogDescription>
            Property values and mortgage associations now live in Settings.
            Super balances and contribution assumptions remain here.
          </DialogDescription>
        </DialogHeader>

        <form action={save} className="flex min-h-0 flex-col">
          <div className="min-h-0 space-y-3 overflow-y-auto p-4">
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
            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
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
                {isPending ? <IconLoader2 className="animate-spin" /> : null}
                {isPending ? "Saving" : "Save super"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type PropertyPortfolioEntry = {
  property: PropertyPreference
  loans: AccountSnapshot[]
  loanBalanceMinor: number
  valueMinor: number
  equityMinor: number
}

function PropertyCard({ entry }: { entry: PropertyPortfolioEntry }) {
  const { property, loans, loanBalanceMinor, valueMinor, equityMinor } = entry
  const ownershipPercent = valueMinor
    ? (Math.max(0, equityMinor) / valueMinor) * 100
    : 0

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <IconBuildingEstate className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {property.displayName}
            </p>
            <Badge variant="secondary" className="capitalize">
              {property.propertyType}
            </Badge>
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-[0.65rem] leading-relaxed text-muted-foreground">
            <IconMapPin className="mt-0.5 size-3 shrink-0" />
            <span>{property.address}</span>
          </p>
        </div>
        <Badge variant={loans.length ? "outline" : "secondary"}>
          {loans.length ? `${loans.length} linked` : "No loan"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted p-3">
        <PropertyValue
          label="Value"
          value={valueMinor ? formatCompactMoney(valueMinor) : "Not set"}
        />
        <PropertyValue
          label="Mortgage"
          value={formatCompactMoney(loanBalanceMinor)}
        />
        <PropertyValue
          label="Equity"
          value={valueMinor ? formatCompactMoney(equityMinor) : "—"}
          accent
        />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[0.62rem]">
          <span className="text-muted-foreground">Owned equity</span>
          <span className="font-mono font-semibold tabular-nums">
            {valueMinor ? formatPercent(ownershipPercent) : "Not available"}
          </span>
        </div>
        <Progress value={ownershipPercent} className="h-1.5" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[0.62rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <IconCalendarStats className="size-3" />
          {property.currentValueMinor
            ? `Valued ${formatDate(property.valuedAt)}`
            : "No current valuation"}
        </span>
        <span>{property.valuationSource ?? "Add details in Settings"}</span>
      </div>
    </article>
  )
}

function PropertyValue({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-[0.58rem] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 truncate font-mono text-xs font-semibold tabular-nums ${accent ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
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
  const propertyIds = new Set(profile.properties.map((property) => property.id))
  const loanAccounts = snapshot.accounts.filter(
    ({ account }) => account.type === "loan"
  )
  const propertyPortfolio: PropertyPortfolioEntry[] = profile.properties.map(
    (property) => {
      const loans = loanAccounts.filter(
        ({ account }) =>
          preferences.accounts[account.id]?.propertyId === property.id
      )
      const loanBalanceMinor = sum(
        loans.map(({ balance }) => Math.abs(balance?.current?.amount ?? 0))
      )
      const valueMinor = property.currentValueMinor ?? 0

      return {
        property,
        loans,
        loanBalanceMinor,
        valueMinor,
        equityMinor: valueMinor - loanBalanceMinor,
      }
    }
  )
  const linkedLoanIds = new Set(
    loanAccounts
      .filter(({ account }) => {
        const propertyId = preferences.accounts[account.id]?.propertyId
        return propertyId ? propertyIds.has(propertyId) : false
      })
      .map(({ account }) => account.id)
  )
  const unlinkedLoans = loanAccounts.filter(
    ({ account }) => !linkedLoanIds.has(account.id)
  )
  const bankAssets = snapshot.accounts
    .filter(({ account, balance }) => {
      const current = balance?.current?.amount ?? 0
      return account.type !== "loan" && current > 0
    })
    .map(({ account, balance }) => ({
      id: account.id,
      name: preferences.accounts[account.id]?.displayName ?? account.name,
      institutionName: account.institution.name,
      institutionLogo: account.institution.logo,
      amountMinor: Math.max(0, balance?.current?.amount ?? 0),
    }))
  const manualAssets = profile.items.filter((item) => item.itemType === "asset")
  const manualLiabilities = profile.items.filter(
    (item) => item.itemType === "liability"
  )

  const propertyValueTotal = sum(
    propertyPortfolio.map((entry) => entry.valueMinor)
  )
  const propertyLoanTotal = sum(
    propertyPortfolio.map((entry) => entry.loanBalanceMinor)
  )
  const allLoanTotal = sum(
    loanAccounts.map(({ balance }) => Math.abs(balance?.current?.amount ?? 0))
  )
  const bankAssetTotal = sum(bankAssets.map((asset) => asset.amountMinor))
  const manualAssetTotal = sum(manualAssets.map((asset) => asset.amountMinor))
  const manualLiabilityTotal = sum(
    manualLiabilities.map((liability) => liability.amountMinor)
  )
  const totalAssets = propertyValueTotal + bankAssetTotal + manualAssetTotal
  const totalLiabilities = allLoanTotal + manualLiabilityTotal
  const netWorth = totalAssets - totalLiabilities
  const propertyEquity = propertyValueTotal - propertyLoanTotal
  const ownershipPercent = propertyValueTotal
    ? (Math.max(0, propertyEquity) / propertyValueTotal) * 100
    : 0
  const lvr = propertyValueTotal
    ? (propertyLoanTotal / propertyValueTotal) * 100
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
  const oneYearSuper = superTotal + netMonthlySuper * 12

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Net Worth
          </h1>
          <p className="mt-1 text-xs text-pretty text-muted-foreground">
            Live account balances combined with your saved property portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            type="button"
            variant="outline"
            size="lg"
            className="h-8"
          >
            <Link href="/settings?section=properties">
              <IconSettings />
              Manage properties
            </Link>
          </Button>
          <NetWorthSettingsDialog profile={profile} onSaved={setProfile} />
        </div>
      </div>

      {!profile.properties.length ? (
        <article className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-card p-5 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <IconBuildingEstate className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">No property portfolio yet</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Add a property and link its mortgage to include property equity in
              this balance sheet.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/settings?section=properties">Add property</Link>
          </Button>
        </article>
      ) : null}

      {unlinkedLoans.length ? (
        <article className="flex gap-3 rounded-xl border border-border bg-card p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <IconUnlink className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {unlinkedLoans.length} mortgage{" "}
              {unlinkedLoans.length === 1 ? "account is" : "accounts are"}{" "}
              unlinked
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The debt is included in net worth, but it cannot be matched to a
              property’s equity until you associate it in Settings.
            </p>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/settings?section=properties">
              <IconLink />
              Link now
            </Link>
          </Button>
        </article>
      ) : null}

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
          detail={
            propertyValueTotal
              ? `${formatPercent(ownershipPercent)} owned · ${formatPercent(lvr)} LVR`
              : "Add a valuation to calculate equity"
          }
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

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Balance sheet</p>
            <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
              Connected balances plus locally maintained property and super
              values.
            </p>
          </div>
          <Badge variant="outline" className="font-mono tabular-nums">
            {formatMoney(netWorth, true)} net
          </Badge>
        </div>

        <div className="grid md:grid-cols-2">
          <BalanceColumn title="Assets" total={totalAssets}>
            {propertyPortfolio.map(({ property, valueMinor }) => (
              <BalanceRow
                key={property.id}
                icon={IconBuildingEstate}
                name={property.displayName}
                detail={property.address}
                amountMinor={valueMinor}
                accent
              />
            ))}
            {bankAssets.map((asset) => (
              <BalanceRow
                key={asset.id}
                logo={{
                  name: asset.institutionName,
                  src: asset.institutionLogo,
                }}
                name={asset.name}
                detail={`${asset.institutionName} · live balance`}
                amountMinor={asset.amountMinor}
              />
            ))}
            {manualAssets.map((asset) => (
              <BalanceRow
                key={asset.id}
                icon={
                  asset.category === "superannuation"
                    ? IconPigMoney
                    : IconWallet
                }
                name={asset.displayName}
                detail={asset.category}
                amountMinor={asset.amountMinor}
              />
            ))}
          </BalanceColumn>

          <BalanceColumn title="Liabilities" total={totalLiabilities} bordered>
            {loanAccounts.map(({ account, balance }) => {
              const propertyId = preferences.accounts[account.id]?.propertyId
              const linkedProperty = profile.properties.find(
                (property) => property.id === propertyId
              )
              return (
                <BalanceRow
                  key={account.id}
                  logo={{
                    name: account.institution.name,
                    src: account.institution.logo,
                  }}
                  name={
                    preferences.accounts[account.id]?.displayName ??
                    account.name
                  }
                  detail={
                    linkedProperty
                      ? `Linked to ${linkedProperty.displayName}`
                      : "Unlinked loan"
                  }
                  amountMinor={Math.abs(balance?.current?.amount ?? 0)}
                />
              )
            })}
            {manualLiabilities.map((liability) => (
              <BalanceRow
                key={liability.id}
                icon={IconWallet}
                name={liability.displayName}
                detail={liability.category}
                amountMinor={liability.amountMinor}
              />
            ))}
          </BalanceColumn>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Property portfolio</p>
            <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
              Values, linked mortgages and equity by property.
            </p>
          </div>
          <Badge variant="secondary">
            {profile.properties.length}{" "}
            {profile.properties.length === 1 ? "property" : "properties"}
          </Badge>
        </div>
        {propertyPortfolio.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {propertyPortfolio.map((entry) => (
              <PropertyCard key={entry.property.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
            Property cards will appear after you add one in Settings.
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
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
            <FlowRow
              label="Gross contribution"
              value={`${formatMoney(profile.settings.monthlySuperContributionMinor)} /mo`}
            />
            <FlowRow
              label={`Contribution tax (${formatPercent(profile.settings.superContributionTaxBps / 100)})`}
              value={`−${formatMoney(monthlySuperTax)}`}
            />
            <FlowRow
              label="Net added to super"
              value={`${formatMoney(netMonthlySuper)} /mo`}
              accent
            />
          </div>
        </article>

        <article className="flex gap-3 rounded-xl border border-border bg-card p-4">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">
              How property debt is handled
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Property values come from your saved valuations. Mortgage balances
              come from connected loan accounts and are counted once, even when
              a loan is not yet associated with a property.
            </p>
          </div>
        </article>
      </section>
    </div>
  )
}

function BalanceColumn({
  title,
  total,
  bordered = false,
  children,
}: {
  title: string
  total: number
  bordered?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={
        bordered ? "border-t border-border md:border-t-0 md:border-l" : ""
      }
    >
      <div className="flex items-center justify-between bg-muted/60 px-4 py-2.5">
        <span className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          {title}
        </span>
        <span className="font-mono text-xs font-semibold tabular-nums">
          {formatMoney(total, true)}
        </span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  )
}

function BalanceRow({
  icon: Icon,
  logo,
  name,
  detail,
  amountMinor,
  accent = false,
}: {
  icon?: React.ComponentType<{ className?: string }>
  logo?: { name: string; src: string | null }
  name: string
  detail: string
  amountMinor: number
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {logo ? (
        <InstitutionLogo
          name={logo.name}
          src={logo.src}
          className="size-9 rounded-lg"
        />
      ) : (
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-lg ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
        >
          {Icon ? (
            <Icon className="size-4" />
          ) : (
            <IconBuildingBank className="size-4" />
          )}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{name}</p>
        <p className="mt-0.5 truncate text-[0.62rem] text-muted-foreground capitalize">
          {detail}
        </p>
      </div>
      <p className="font-mono text-xs font-semibold tabular-nums">
        {formatMoney(amountMinor, true)}
      </p>
    </div>
  )
}

function FlowRow({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 text-xs">
      <span className={accent ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={`font-mono font-semibold tabular-nums ${accent ? "text-primary" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconBuildingEstate,
  IconCheck,
  IconEdit,
  IconHomeDollar,
  IconLink,
  IconLoader2,
  IconMapPin,
  IconPlus,
  IconReceiptDollar,
  IconTrash,
  IconUnlink,
} from "@tabler/icons-react"

import {
  deleteProperty,
  saveProperty,
  setAccountProperty,
} from "@/app/actions/properties"
import { InstitutionLogo } from "@/components/institution-logo"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { formatCompactMoney, formatMoney } from "@/lib/finance"
import type {
  DashboardPreferences,
  PropertyPreference,
} from "@/lib/preferences-types"
import type { FinancialSnapshot } from "@/lib/redbark-types"

const PROPERTY_TYPES = [
  ["residential", "House"],
  ["apartment", "Apartment"],
  ["townhouse", "Townhouse"],
  ["land", "Land"],
  ["commercial", "Commercial"],
  ["other", "Other"],
] as const

function amountValue(amountMinor: number | null) {
  return amountMinor === null ? "" : (amountMinor / 100).toFixed(2)
}

function propertyTypeLabel(value: string) {
  return PROPERTY_TYPES.find(([type]) => type === value)?.[1] ?? "Property"
}

function PropertyDialog({
  property,
  onSaved,
}: {
  property?: PropertyPreference
  onSaved: (property: PropertyPreference) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await saveProperty(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }

      onSaved(result.property)
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
        {property ? (
          <Button type="button" variant="outline" size="sm">
            <IconEdit />
            Edit
          </Button>
        ) : (
          <Button type="button" size="lg">
            <IconPlus />
            Add property
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border p-4 pr-12">
          <DialogTitle>
            {property ? "Edit property" : "Add a property"}
          </DialogTitle>
          <DialogDescription>
            Store the property once, then link its mortgage from the connected
            accounts section.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="flex min-h-0 flex-col">
          {property ? (
            <input type="hidden" name="propertyId" value={property.id} />
          ) : null}
          <div className="min-h-0 space-y-5 overflow-y-auto p-4">
            <section>
              <p className="text-[0.62rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Identity
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_0.65fr]">
                <div>
                  <Label htmlFor={`property-name-${property?.id ?? "new"}`}>
                    Property name
                  </Label>
                  <Input
                    id={`property-name-${property?.id ?? "new"}`}
                    name="displayName"
                    defaultValue={property?.displayName}
                    placeholder="Home, beach house, investment unit…"
                    maxLength={80}
                    className="mt-1.5 h-9"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`property-type-${property?.id ?? "new"}`}>
                    Type
                  </Label>
                  <NativeSelect
                    id={`property-type-${property?.id ?? "new"}`}
                    name="propertyType"
                    defaultValue={property?.propertyType ?? "residential"}
                    className="mt-1.5 w-full"
                  >
                    {PROPERTY_TYPES.map(([value, label]) => (
                      <NativeSelectOption key={value} value={value}>
                        {label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-5">
              <p className="text-[0.62rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Location
              </p>
              <div className="mt-2">
                <Label htmlFor={`address-${property?.id ?? "new"}`}>
                  Street address
                </Label>
                <Input
                  id={`address-${property?.id ?? "new"}`}
                  name="addressLine1"
                  defaultValue={property?.addressLine1}
                  placeholder="Street address"
                  maxLength={120}
                  className="mt-1.5 h-9"
                  required
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_0.55fr_0.45fr]">
                <div>
                  <Label htmlFor={`suburb-${property?.id ?? "new"}`}>
                    Suburb
                  </Label>
                  <Input
                    id={`suburb-${property?.id ?? "new"}`}
                    name="suburb"
                    defaultValue={property?.suburb}
                    placeholder="Suburb"
                    maxLength={80}
                    className="mt-1.5 h-9"
                  />
                </div>
                <div>
                  <Label htmlFor={`state-${property?.id ?? "new"}`}>
                    State
                  </Label>
                  <Input
                    id={`state-${property?.id ?? "new"}`}
                    name="state"
                    defaultValue={property?.state}
                    placeholder="VIC"
                    maxLength={24}
                    className="mt-1.5 h-9 uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor={`postcode-${property?.id ?? "new"}`}>
                    Postcode
                  </Label>
                  <Input
                    id={`postcode-${property?.id ?? "new"}`}
                    name="postcode"
                    defaultValue={property?.postcode}
                    inputMode="numeric"
                    placeholder="3205"
                    maxLength={12}
                    className="mt-1.5 h-9 font-mono"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor={`country-${property?.id ?? "new"}`}>
                  Country
                </Label>
                <Input
                  id={`country-${property?.id ?? "new"}`}
                  name="country"
                  defaultValue={property?.country ?? "Australia"}
                  maxLength={80}
                  className="mt-1.5 h-9"
                  required
                />
              </div>
            </section>

            <section className="border-t border-border pt-5">
              <p className="text-[0.62rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                Purchase & valuation
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <MoneyField
                  id={`purchase-price-${property?.id ?? "new"}`}
                  name="purchasePrice"
                  label="Purchase price"
                  defaultValue={property?.purchasePriceMinor ?? null}
                />
                <DateField
                  id={`purchase-date-${property?.id ?? "new"}`}
                  name="purchaseDate"
                  label="Purchase date"
                  defaultValue={property?.purchaseDate ?? ""}
                />
                <MoneyField
                  id={`current-value-${property?.id ?? "new"}`}
                  name="currentValue"
                  label="Current value"
                  defaultValue={property?.currentValueMinor ?? null}
                />
                <DateField
                  id={`valued-at-${property?.id ?? "new"}`}
                  name="valuedAt"
                  label="Valuation date"
                  defaultValue={property?.valuedAt ?? ""}
                />
              </div>
              <div className="mt-3">
                <Label htmlFor={`valuation-source-${property?.id ?? "new"}`}>
                  Valuation source
                </Label>
                <Input
                  id={`valuation-source-${property?.id ?? "new"}`}
                  name="valuationSource"
                  defaultValue={property?.valuationSource ?? "Owner estimate"}
                  placeholder="Owner estimate, bank valuation…"
                  maxLength={80}
                  className="mt-1.5 h-9"
                />
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
                {isPending ? (
                  <IconLoader2 className="animate-spin" />
                ) : (
                  <IconCheck />
                )}
                {isPending ? "Saving" : "Save property"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MoneyField({
  id,
  name,
  label,
  defaultValue,
  hint,
}: {
  id: string
  name: string
  label: string
  defaultValue: number | null
  hint?: string
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
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
        />
      </div>
      {hint ? (
        <p className="mt-1 text-[0.6rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function DeletePropertyDialog({
  property,
  linkedLoanCount,
  onDeleted,
}: {
  property: PropertyPreference
  linkedLoanCount: number
  onDeleted: (propertyId: string) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function remove(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set("propertyId", property.id)
      const result = await deleteProperty(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }

      onDeleted(result.propertyId)
      setOpen(false)
      router.refresh()
    })
  }

  const mortgageCopy = linkedLoanCount
    ? `${linkedLoanCount} linked ${linkedLoanCount === 1 ? "mortgage" : "mortgages"} will remain connected but become unlinked.`
    : "No connected mortgages are linked to it."

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setError(null)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Delete ${property.displayName}`}
          className="text-muted-foreground hover:border-destructive/30 hover:text-destructive"
        >
          <IconTrash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <IconTrash />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {property.displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its saved details and valuation will be permanently removed.{" "}
            {mortgageCopy}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-xs text-destructive" aria-live="polite">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={remove}
            disabled={isPending}
          >
            {isPending ? <IconLoader2 className="animate-spin" /> : null}
            {isPending ? "Deleting" : "Delete property"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DateField({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string
  name: string
  label: string
  defaultValue: string
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="date"
        defaultValue={defaultValue}
        className="mt-1.5 h-9"
      />
    </div>
  )
}

export function PropertyAccountsManager({
  snapshot,
  preferences,
}: {
  snapshot: FinancialSnapshot
  preferences: DashboardPreferences
}) {
  const router = useRouter()
  const [properties, setProperties] = React.useState(preferences.properties)
  const [propertyByAccount, setPropertyByAccount] = React.useState(() =>
    Object.fromEntries(
      Object.values(preferences.accounts).map((account) => [
        account.accountId,
        account.propertyId,
      ])
    )
  )
  const [linkError, setLinkError] = React.useState<string | null>(null)
  const [pendingAccountId, setPendingAccountId] = React.useState<string | null>(
    null
  )

  const loanAccounts = snapshot.accounts.filter(
    ({ account }) => account.type === "loan"
  )
  const linkedLoanCount = loanAccounts.filter(
    ({ account }) => propertyByAccount[account.id]
  ).length
  const portfolioValue = properties.reduce(
    (total, property) => total + (property.currentValueMinor ?? 0),
    0
  )

  function propertySaved(property: PropertyPreference) {
    setProperties((current) => {
      const exists = current.some((item) => item.id === property.id)
      return exists
        ? current.map((item) => (item.id === property.id ? property : item))
        : [...current, property]
    })
  }

  function propertyDeleted(propertyId: string) {
    setProperties((current) =>
      current.filter((property) => property.id !== propertyId)
    )
    setPropertyByAccount((current) =>
      Object.fromEntries(
        Object.entries(current).map(([accountId, linkedPropertyId]) => [
          accountId,
          linkedPropertyId === propertyId ? null : linkedPropertyId,
        ])
      )
    )
  }

  function assign(accountId: string, propertyId: string) {
    const previous = propertyByAccount[accountId] ?? null
    const nextPropertyId = propertyId === "unlinked" ? null : propertyId
    setLinkError(null)
    setPendingAccountId(accountId)
    setPropertyByAccount((current) => ({
      ...current,
      [accountId]: nextPropertyId,
    }))

    const formData = new FormData()
    formData.set("accountId", accountId)
    formData.set("propertyId", propertyId)
    void setAccountProperty(formData).then((result) => {
      setPendingAccountId(null)
      if (!result.ok) {
        setPropertyByAccount((current) => ({
          ...current,
          [accountId]: previous,
        }))
        setLinkError(result.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryTile
          icon={IconBuildingEstate}
          label="Properties"
          value={String(properties.length)}
        />
        <SummaryTile
          icon={IconLink}
          label="Linked mortgages"
          value={`${linkedLoanCount} of ${loanAccounts.length}`}
        />
        <SummaryTile
          icon={IconHomeDollar}
          label="Portfolio value"
          value={
            portfolioValue ? formatCompactMoney(portfolioValue) : "Not valued"
          }
        />
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Property portfolio</CardTitle>
          <CardDescription>
            Property details and valuations are stored locally and reused across
            Nest.
          </CardDescription>
          <CardAction>
            <PropertyDialog onSaved={propertySaved} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {properties.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {properties.map((property) => {
                const linkedLoans = loanAccounts.filter(
                  ({ account }) => propertyByAccount[account.id] === property.id
                )

                return (
                  <article
                    key={property.id}
                    className="rounded-xl border border-border bg-muted/35 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
                        <IconBuildingEstate className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {property.displayName}
                          </p>
                          <Badge variant="secondary">
                            {propertyTypeLabel(property.propertyType)}
                          </Badge>
                        </div>
                        <p className="mt-1 flex items-start gap-1.5 text-[0.65rem] leading-relaxed text-muted-foreground">
                          <IconMapPin className="mt-0.5 size-3 shrink-0" />
                          <span>{property.address}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <PropertyDialog
                          property={property}
                          onSaved={propertySaved}
                        />
                        <DeletePropertyDialog
                          property={property}
                          linkedLoanCount={linkedLoans.length}
                          onDeleted={propertyDeleted}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <PropertyMetric
                        icon={IconHomeDollar}
                        label="Current value"
                        value={
                          property.currentValueMinor === null
                            ? "Not set"
                            : formatMoney(property.currentValueMinor, true)
                        }
                      />
                      <PropertyMetric
                        icon={IconReceiptDollar}
                        label="Purchase price"
                        value={
                          property.purchasePriceMinor === null
                            ? "Not set"
                            : formatMoney(property.purchasePriceMinor, true)
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="min-w-0">
                        <p className="text-[0.6rem] font-medium text-muted-foreground uppercase">
                          Linked lending
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium">
                          {linkedLoans.length
                            ? linkedLoans
                                .map(
                                  ({ account }) =>
                                    preferences.accounts[account.id]
                                      ?.displayName ?? account.name
                                )
                                .join(", ")
                            : "No mortgage linked"}
                        </p>
                      </div>
                      <Badge
                        variant={linkedLoans.length ? "outline" : "secondary"}
                      >
                        {linkedLoans.length || "Unlinked"}
                      </Badge>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/25 p-6 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-background text-muted-foreground ring-1 ring-foreground/10">
                  <IconBuildingEstate className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold">
                  Add your first property
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Once it is saved, you can associate a connected mortgage and
                  use its live balance in net worth calculations.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Mortgage associations</CardTitle>
          <CardDescription>
            Choose which property each connected loan finances. Unlinked loans
            remain visible as general liabilities.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              {loanAccounts.length}{" "}
              {loanAccounts.length === 1 ? "loan" : "loans"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loanAccounts.length ? (
            <div className="divide-y divide-border rounded-lg bg-muted/45 px-3">
              {loanAccounts.map(({ account, balance }) => {
                const preference = preferences.accounts[account.id]
                const selected = propertyByAccount[account.id] ?? "unlinked"

                return (
                  <div
                    key={account.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <InstitutionLogo
                        name={account.institution.name}
                        src={account.institution.logo}
                        className="size-10 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {preference?.displayName ?? account.name}
                        </p>
                        <p className="mt-0.5 text-[0.62rem] text-muted-foreground">
                          {account.institution.name} ·{" "}
                          {formatMoney(
                            Math.abs(balance?.current?.amount ?? 0),
                            true
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-13 sm:pl-0">
                      {selected === "unlinked" ? (
                        <IconUnlink className="size-3.5 text-muted-foreground" />
                      ) : (
                        <IconLink className="size-3.5 text-primary" />
                      )}
                      <NativeSelect
                        value={selected}
                        onChange={(event) =>
                          assign(account.id, event.target.value)
                        }
                        disabled={pendingAccountId === account.id}
                        aria-label={`Property linked to ${preference?.displayName ?? account.name}`}
                        className="w-full sm:w-56"
                      >
                        <NativeSelectOption value="unlinked">
                          Not linked to a property
                        </NativeSelectOption>
                        {properties.map((property) => (
                          <NativeSelectOption
                            key={property.id}
                            value={property.id}
                          >
                            {property.displayName}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      {pendingAccountId === account.id ? (
                        <IconLoader2 className="size-3.5 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-muted/45 px-3 py-8 text-center text-xs text-muted-foreground">
              Connected loan or mortgage accounts will appear here.
            </p>
          )}
          <p
            className="mt-2 min-h-4 text-[0.65rem] text-destructive"
            aria-live="polite"
          >
            {linkError}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.6rem] text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 truncate font-mono text-xs font-semibold tabular-nums">
          {value}
        </p>
      </div>
    </div>
  )
}

function PropertyMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-background p-2.5 ring-1 ring-foreground/8">
      <div className="flex items-center gap-1.5 text-[0.6rem] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-1.5 truncate font-mono text-xs font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconChevronDown,
  IconDatabase,
  IconPhotoPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react"

import {
  refreshTransactionDetails,
  removeTransactionMerchantLogo,
  saveTransactionCategory,
  saveTransactionMerchantCustomisation,
} from "@/app/actions/transactions"
import { IconlyCategoryIcon } from "@/components/iconly-category-icon"
import { InstitutionLogo } from "@/components/institution-logo"
import { MerchantLogo } from "@/components/merchant-logo"
import { TransactionNoteEditor } from "@/components/transaction-note-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  formatCategory,
  formatDateKey,
  formatMoney,
  getMerchantName,
  TRANSACTION_CATEGORY_OPTIONS,
} from "@/lib/finance"
import { getMerchantIdentity } from "@/lib/merchant-identity"
import type { AccountItem, Transaction } from "@/lib/redbark-types"
import { transactionStatusClassName } from "@/lib/transaction-status"

const BANK_CATEGORY_VALUE = "__BANK_CATEGORY__"

function formatDateTime(
  date: string,
  datetime: string | null,
  timezone: string
) {
  if (!datetime) {
    return formatDateKey(date, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(datetime))
}

function DetailsRow({
  label,
  children,
  mono = false,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b border-border py-3 last:border-b-0">
      <dt className="text-[0.65rem] text-muted-foreground">{label}</dt>
      <dd
        className={`min-w-0 text-right text-xs font-medium ${
          mono ? "font-mono text-[0.65rem] break-all" : ""
        }`}
      >
        {children}
      </dd>
    </div>
  )
}

export function TransactionDetailsSheet({
  transaction,
  account,
  accountName,
  institutionName,
  institutionLogo,
  timezone,
  onOpenChange,
  onTransactionChange,
}: {
  transaction: Transaction | null
  account: AccountItem | null
  accountName: string
  institutionName: string
  institutionLogo: string | null
  timezone: string
  onOpenChange: (open: boolean) => void
  onTransactionChange: (transaction: Transaction) => void
}) {
  const router = useRouter()
  const [isEditingLogo, setIsEditingLogo] = React.useState(false)
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = React.useState(false)
  const [categoryError, setCategoryError] = React.useState<string | null>(null)
  const [logoError, setLogoError] = React.useState<string | null>(null)
  const [refreshError, setRefreshError] = React.useState<string | null>(null)
  const [isSavingLogo, startSavingLogo] = React.useTransition()
  const [isSavingCategory, startSavingCategory] = React.useTransition()
  const [isRefreshing, startRefreshing] = React.useTransition()
  const logoFileId = React.useId()

  const merchant = transaction ? getMerchantName(transaction) : "Transaction"
  const isCredit =
    transaction?.direction === "credit" ||
    (transaction?.amount?.amount ?? 0) > 0

  function changeCategory(value: string) {
    if (!transaction) return

    setIsCategoryPickerOpen(false)
    setCategoryError(null)
    const category = value === BANK_CATEGORY_VALUE ? null : value
    startSavingCategory(async () => {
      const result = await saveTransactionCategory(transaction.id, category)
      if (!result.ok) {
        setCategoryError(result.message)
        return
      }

      onTransactionChange(result.transaction)
      router.refresh()
    })
  }

  function saveLogo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!transaction) return

    setLogoError(null)
    const formData = new FormData(event.currentTarget)
    formData.set("transactionId", transaction.id)

    startSavingLogo(async () => {
      const result = await saveTransactionMerchantCustomisation(formData)
      if (!result.ok) {
        setLogoError(result.message)
        return
      }

      onTransactionChange({
        ...transaction,
        custom_logo: result.logoUrl,
        custom_merchant_name: result.customName,
      })
      setIsEditingLogo(false)
      router.refresh()
    })
  }

  function removeLogo() {
    if (!transaction) return

    setLogoError(null)
    startSavingLogo(async () => {
      const result = await removeTransactionMerchantLogo(transaction.id)
      if (!result.ok) {
        setLogoError(result.message)
        return
      }

      onTransactionChange({
        ...transaction,
        custom_logo: null,
        custom_merchant_name: result.customName,
      })
      setIsEditingLogo(false)
      router.refresh()
    })
  }

  function refreshDetails() {
    if (!transaction) return

    setRefreshError(null)
    startRefreshing(async () => {
      const result = await refreshTransactionDetails(
        transaction.id,
        transaction.account
      )
      if (!result.ok) {
        setRefreshError(result.message)
        return
      }

      onTransactionChange(result.transaction)
      router.refresh()
    })
  }

  return (
    <Sheet open={transaction !== null} onOpenChange={onOpenChange}>
      {transaction && (
        <SheetContent className="w-[min(92vw,27rem)] overflow-y-auto p-0 shadow-none sm:max-w-[27rem]">
          <SheetHeader className="border-b border-border px-5 py-5 pr-14">
            <div className="flex items-center gap-3">
              <MerchantLogo
                name={merchant}
                category={transaction.provider_category}
                src={transaction.custom_logo}
                className="size-11 rounded-xl"
              />
              <div className="min-w-0">
                <SheetTitle className="truncate text-base font-semibold">
                  {merchant}
                </SheetTitle>
                <SheetDescription className="mt-0.5">
                  Transaction details
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="border-b border-border px-5 py-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-medium text-muted-foreground">
                  Amount
                </p>
                <p
                  className={`mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums ${
                    isCredit
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-foreground"
                  }`}
                >
                  {formatMoney(transaction.amount?.amount)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`mb-1 h-6 gap-1.5 px-2 text-[0.6rem] font-medium capitalize ${transactionStatusClassName(
                  transaction.status
                )}`}
              >
                {isCredit ? (
                  <IconArrowDownLeft className="size-3" />
                ) : (
                  <IconArrowUpRight className="size-3" />
                )}
                {transaction.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <section aria-labelledby="transaction-account-heading">
              <p
                id="transaction-account-heading"
                className="text-[0.6rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
              >
                Account
              </p>
              <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
                <InstitutionLogo
                  name={institutionName}
                  src={institutionLogo}
                  className="size-9 rounded-lg"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {accountName}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[0.6rem] text-muted-foreground">
                    {account?.account_number ?? institutionName}
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby="transaction-merchant-heading">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    id="transaction-merchant-heading"
                    className="text-[0.6rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
                  >
                    Merchant details
                  </p>
                  <p className="mt-1 text-[0.62rem] text-muted-foreground">
                    Reused for future transactions matched as{" "}
                    {getMerchantIdentity(transaction).displayName}.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 rounded-md px-2.5 text-[0.62rem]"
                  onClick={() => {
                    setLogoError(null)
                    setIsEditingLogo((value) => !value)
                  }}
                >
                  <IconPhotoPlus className="size-3.5" />
                  Customize
                </Button>
              </div>

              {isEditingLogo && (
                <form
                  onSubmit={saveLogo}
                  className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div>
                    <label
                      htmlFor={`${logoFileId}-name`}
                      className="text-[0.62rem] font-medium"
                    >
                      Business name
                    </label>
                    <Input
                      id={`${logoFileId}-name`}
                      name="customName"
                      type="text"
                      maxLength={120}
                      defaultValue={merchant}
                      className="mt-1.5 h-8 bg-background text-xs"
                    />
                    <p className="mt-1 text-[0.58rem] text-muted-foreground">
                      Clear this to restore the original business name.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor={logoFileId}
                      className="text-[0.62rem] font-medium"
                    >
                      Upload an image
                    </label>
                    <Input
                      id={logoFileId}
                      name="logoFile"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="mt-1.5 h-8 bg-background text-[0.62rem] file:mr-2 file:text-[0.62rem]"
                    />
                    <p className="mt-1 text-[0.58rem] text-muted-foreground">
                      PNG, JPEG, WebP, GIF or SVG · 750 KB maximum
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[0.58rem] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                    or
                  </div>

                  <div>
                    <label
                      htmlFor={`${logoFileId}-url`}
                      className="text-[0.62rem] font-medium"
                    >
                      Image URL
                    </label>
                    <Input
                      id={`${logoFileId}-url`}
                      name="logoUrl"
                      type="url"
                      placeholder="https://…"
                      className="mt-1.5 h-8 bg-background text-xs"
                    />
                  </div>

                  {logoError && (
                    <p className="text-[0.62rem] text-destructive" role="alert">
                      {logoError}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      {transaction.custom_logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-md px-2 text-[0.62rem] text-destructive hover:text-destructive"
                          onClick={removeLogo}
                          disabled={isSavingLogo}
                        >
                          <IconTrash className="size-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-md px-2.5 text-[0.62rem]"
                        onClick={() => setIsEditingLogo(false)}
                        disabled={isSavingLogo}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="h-7 rounded-md px-2.5 text-[0.62rem]"
                        disabled={isSavingLogo}
                      >
                        {isSavingLogo ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </section>

            <section aria-labelledby="transaction-overview-heading">
              <p
                id="transaction-overview-heading"
                className="text-[0.6rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
              >
                Overview
              </p>
              <dl className="mt-1">
                <DetailsRow label="Date">
                  {formatDateTime(
                    transaction.date,
                    transaction.datetime,
                    timezone
                  )}
                </DetailsRow>
                {(transaction.post_date || transaction.post_datetime) && (
                  <DetailsRow label="Posted">
                    {formatDateTime(
                      transaction.post_date ?? transaction.date,
                      transaction.post_datetime,
                      timezone
                    )}
                  </DetailsRow>
                )}
                {(transaction.value_date || transaction.value_datetime) && (
                  <DetailsRow label="Value date">
                    {formatDateTime(
                      transaction.value_date ?? transaction.date,
                      transaction.value_datetime,
                      timezone
                    )}
                  </DetailsRow>
                )}
                <DetailsRow label="Category">
                  <span className="flex flex-col items-end gap-1.5">
                    <Popover
                      open={isCategoryPickerOpen}
                      onOpenChange={setIsCategoryPickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          role="combobox"
                          aria-label="Transaction category"
                          aria-expanded={isCategoryPickerOpen}
                          className="h-7 w-[11.5rem] justify-between rounded-md bg-background px-2.5 text-[0.65rem] font-medium shadow-none"
                          disabled={isSavingCategory}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <IconlyCategoryIcon
                              category={
                                transaction.custom_category ??
                                transaction.bank_provider_category ??
                                transaction.provider_category
                              }
                              className="size-3.5 shrink-0 text-muted-foreground"
                            />
                            <span className="truncate">
                              {transaction.custom_category
                                ? formatCategory(transaction.custom_category)
                                : formatCategory(
                                    transaction.bank_provider_category ??
                                      transaction.provider_category
                                  )}
                            </span>
                          </span>
                          <IconChevronDown className="ml-2 size-3 shrink-0 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-60 gap-0 rounded-md p-0 shadow-none"
                      >
                        <Command>
                          <CommandInput
                            placeholder="Search categories…"
                            autoFocus
                          />
                          <CommandList
                            className="minimal-scrollbar max-h-60 overscroll-contain pr-1"
                            onWheel={(event) => {
                              event.stopPropagation()
                              event.currentTarget.scrollTop += event.deltaY
                            }}
                          >
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value={`auto selected ${formatCategory(
                                  transaction.bank_provider_category ??
                                    transaction.provider_category
                                )}`}
                                data-checked={!transaction.custom_category}
                                onSelect={() =>
                                  changeCategory(BANK_CATEGORY_VALUE)
                                }
                              >
                                <IconlyCategoryIcon
                                  category={
                                    transaction.bank_provider_category ??
                                    transaction.provider_category
                                  }
                                  className="size-3.5 shrink-0 text-muted-foreground"
                                />
                                <span className="flex min-w-0 flex-col items-start leading-tight">
                                  <span className="max-w-full truncate">
                                    {formatCategory(
                                      transaction.bank_provider_category ??
                                        transaction.provider_category
                                    )}
                                  </span>
                                  <span className="mt-0.5 text-[0.58rem] font-normal text-muted-foreground">
                                    Auto-selected category
                                  </span>
                                </span>
                              </CommandItem>
                              {TRANSACTION_CATEGORY_OPTIONS.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  value={option.label}
                                  data-checked={
                                    transaction.custom_category === option.value
                                  }
                                  onSelect={() => changeCategory(option.value)}
                                >
                                  <IconlyCategoryIcon
                                    category={option.value}
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                  />
                                  <span className="truncate">
                                    {option.label}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {isSavingCategory ? (
                      <span className="text-[0.56rem] font-normal text-muted-foreground">
                        Saving category…
                      </span>
                    ) : null}
                    {categoryError ? (
                      <span
                        className="max-w-[12rem] text-[0.58rem] font-normal text-destructive"
                        role="alert"
                      >
                        {categoryError}
                      </span>
                    ) : null}
                  </span>
                </DetailsRow>
                <DetailsRow label="Direction">
                  <span className="capitalize">{transaction.direction}</span>
                </DetailsRow>
                <DetailsRow label="Currency">
                  <span className="inline-flex items-center justify-end gap-1.5 uppercase">
                    <span role="img" aria-label="Australia">
                      🇦🇺
                    </span>
                    {(
                      transaction.amount?.currency ??
                      account?.currency ??
                      "AUD"
                    ).toUpperCase()}
                  </span>
                </DetailsRow>
              </dl>
            </section>

            <section aria-labelledby="transaction-description-heading">
              <p
                id="transaction-description-heading"
                className="text-[0.6rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
              >
                Bank description
              </p>
              <p className="mt-2 rounded-lg border border-border bg-muted/30 p-3 font-mono text-[0.65rem] leading-relaxed break-words">
                {transaction.description}
              </p>
            </section>

            <TransactionNoteEditor
              key={transaction.id}
              transaction={transaction}
              onTransactionChange={onTransactionChange}
            />

            <section
              className="rounded-lg border border-border px-3"
              aria-label="Stored transaction metadata"
            >
              <DetailsRow label="Transaction ID" mono>
                {transaction.id}
              </DetailsRow>
              <DetailsRow label="Data source">
                <span className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    <IconDatabase className="size-3 text-muted-foreground" />
                    Stored locally
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 rounded-md px-1.5 text-[0.58rem]"
                    onClick={refreshDetails}
                    disabled={isRefreshing}
                  >
                    <IconRefresh
                      className={`size-3 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                    {isRefreshing ? "Refreshing…" : "Refresh from Redbark"}
                  </Button>
                </span>
              </DetailsRow>
            </section>

            {refreshError && (
              <p className="text-[0.62rem] text-destructive" role="alert">
                {refreshError}
              </p>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  )
}

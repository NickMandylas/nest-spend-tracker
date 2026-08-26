"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconSelector,
  IconSearch,
} from "@tabler/icons-react"

import { InstitutionLogo } from "@/components/institution-logo"
import { MerchantLogo } from "@/components/merchant-logo"
import { TransactionDetailsSheet } from "@/components/transaction-details-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  flattenTransactions,
  formatCategory,
  formatMoney,
  formatTransactionDateTime,
  getMerchantName,
} from "@/lib/finance"
import { getMerchantIdentity } from "@/lib/merchant-identity"
import type { DashboardPreferences } from "@/lib/preferences-types"
import type {
  AccountItem,
  FinancialSnapshot,
  Transaction,
} from "@/lib/redbark-types"
import { transactionStatusClassName } from "@/lib/transaction-status"

type SortKey = "merchant" | "date" | "category" | "account" | "amount"
type SortDirection = "asc" | "desc"

const PAGE_SIZE = 15

function accountLabel(account: AccountItem, preferences: DashboardPreferences) {
  const customName = preferences.accounts[account.id]?.displayName
  if (customName) return customName
  if (account.type === "loan") return "Property loan"
  if (account.name.toLowerCase().includes("offset")) return "Offset"
  return account.name
}

function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right
  }
  return String(left).localeCompare(String(right), "en-AU", {
    numeric: true,
    sensitivity: "base",
  })
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: SortDirection
}) {
  if (!active)
    return <IconSelector className="size-3 text-muted-foreground/70" />
  return direction === "asc" ? (
    <IconChevronUp className="size-3" />
  ) : (
    <IconChevronDown className="size-3" />
  )
}

export function ActivityDataTable({
  snapshot,
  preferences,
}: {
  snapshot: FinancialSnapshot
  preferences: DashboardPreferences
}) {
  const [search, setSearch] = React.useState("")
  const [selectedAccount, setSelectedAccount] = React.useState("all")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [sortKey, setSortKey] = React.useState<SortKey>("date")
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>("desc")
  const [page, setPage] = React.useState(1)
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<Transaction | null>(null)
  const [merchantOverrides, setMerchantOverrides] = React.useState<
    Record<string, { logo: string | null; name: string | null }>
  >({})

  const accountMap = React.useMemo(
    () =>
      new Map(
        snapshot.accounts.map(({ account }) => [account.id, account] as const)
      ),
    [snapshot.accounts]
  )

  const transactions = React.useMemo(
    () => flattenTransactions(snapshot.accounts),
    [snapshot.accounts]
  )

  const merchantLogoFor = React.useCallback(
    (transaction: Transaction) => {
      const key = getMerchantIdentity(transaction).matchKey
      return Object.prototype.hasOwnProperty.call(merchantOverrides, key)
        ? merchantOverrides[key].logo
        : transaction.custom_logo
    },
    [merchantOverrides]
  )

  const merchantNameFor = React.useCallback(
    (transaction: Transaction) => {
      const key = getMerchantIdentity(transaction).matchKey
      return Object.prototype.hasOwnProperty.call(merchantOverrides, key)
        ? (merchantOverrides[key].name ??
            getMerchantIdentity(transaction).displayName)
        : getMerchantName(transaction)
    },
    [merchantOverrides]
  )

  const transactionWithMerchantOverrides = React.useCallback(
    (transaction: Transaction) => {
      const key = getMerchantIdentity(transaction).matchKey
      const override = merchantOverrides[key]
      return override
        ? {
            ...transaction,
            custom_logo: override.logo,
            custom_merchant_name: override.name,
          }
        : transaction
    },
    [merchantOverrides]
  )

  const categories = React.useMemo(
    () =>
      [
        ...new Set(
          transactions.map((item) => item.provider_category ?? "UNCATEGORISED")
        ),
      ]
        .map((value) => ({ value, label: formatCategory(value) }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [transactions]
  )

  const filteredTransactions = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    return transactions.filter((transaction) => {
      const account = accountMap.get(transaction.account)
      const category = transaction.provider_category ?? "UNCATEGORISED"
      const searchableText = [
        merchantNameFor(transaction),
        transaction.description,
        formatCategory(category),
        account ? accountLabel(account, preferences) : "",
      ]
        .join(" ")
        .toLowerCase()

      return (
        (!query || searchableText.includes(query)) &&
        (selectedAccount === "all" ||
          transaction.account === selectedAccount) &&
        (selectedCategory === "all" || category === selectedCategory)
      )
    })
  }, [
    accountMap,
    preferences,
    search,
    selectedAccount,
    selectedCategory,
    merchantNameFor,
    transactions,
  ])

  const sortedTransactions = React.useMemo(() => {
    const valueFor = (transaction: Transaction): string | number => {
      const account = accountMap.get(transaction.account)

      switch (sortKey) {
        case "merchant":
          return merchantNameFor(transaction)
        case "date":
          return transaction.datetime ?? transaction.date
        case "category":
          return formatCategory(transaction.provider_category)
        case "account":
          return account ? accountLabel(account, preferences) : "Account"
        case "amount":
          return transaction.amount?.amount ?? 0
      }
    }

    return [...filteredTransactions].sort((left, right) => {
      const result = compareValues(valueFor(left), valueFor(right))
      return sortDirection === "asc" ? result : -result
    })
  }, [
    accountMap,
    filteredTransactions,
    merchantNameFor,
    preferences,
    sortDirection,
    sortKey,
  ])

  const pageCount = Math.max(
    1,
    Math.ceil(sortedTransactions.length / PAGE_SIZE)
  )
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageTransactions = sortedTransactions.slice(
    pageStart,
    pageStart + PAGE_SIZE
  )
  const detailAccount = selectedTransaction
    ? (accountMap.get(selectedTransaction.account) ?? null)
    : null
  const detailAccountPreference = detailAccount
    ? preferences.accounts[detailAccount.id]
    : null

  function resetPage() {
    setPage(1)
  }

  function changeSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(nextKey)
      setSortDirection(
        nextKey === "date" || nextKey === "amount" ? "desc" : "asc"
      )
    }
    resetPage()
  }

  function sortButton(
    label: string,
    key: SortKey,
    align: "left" | "right" = "left"
  ) {
    const active = sortKey === key
    return (
      <button
        type="button"
        onClick={() => changeSort(key)}
        className={`inline-flex h-10 items-center gap-1 rounded-sm px-1 text-[0.65rem] font-semibold transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 ${
          align === "right" ? "ml-auto" : "-ml-1"
        } ${active ? "text-foreground" : "text-muted-foreground"}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <SortIcon active={active} direction={sortDirection} />
      </button>
    )
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      aria-labelledby="transactions-title"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
        <h1
          id="transactions-title"
          className="text-sm font-semibold tracking-tight text-balance"
        >
          Transactions
        </h1>

        <div className="grid w-full gap-2 sm:grid-cols-3 xl:w-[45rem]">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                resetPage()
              }}
              placeholder="Search transactions"
              aria-label="Search transactions"
              className="h-10 rounded-md bg-background pr-3 pl-9 text-xs"
            />
          </div>
          <Select
            value={selectedAccount}
            onValueChange={(value) => {
              setSelectedAccount(value ?? "all")
              resetPage()
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-md bg-background px-3 data-[size=default]:h-10">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent className="shadow-none">
              <SelectItem value="all">All accounts</SelectItem>
              {snapshot.accounts.map(({ account }) => (
                <SelectItem key={account.id} value={account.id}>
                  {accountLabel(account, preferences)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value ?? "all")
              resetPage()
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-md bg-background px-3 data-[size=default]:h-10">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className="shadow-none">
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table
        className="min-w-[660px]"
        containerClassName="max-h-[60svh] overflow-auto lg:max-h-[calc(100svh-13rem)]"
      >
        <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead
              className="h-10 w-[38%] pl-4 sm:pl-5"
              aria-sort={
                sortKey === "merchant"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              {sortButton("Description", "merchant")}
            </TableHead>
            <TableHead
              className="h-10 w-28"
              aria-sort={
                sortKey === "date"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              {sortButton("Date", "date")}
            </TableHead>
            <TableHead
              className="hidden h-10 md:table-cell"
              aria-sort={
                sortKey === "category"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              {sortButton("Category", "category")}
            </TableHead>
            <TableHead
              className="hidden h-10 lg:table-cell"
              aria-sort={
                sortKey === "account"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              {sortButton("Account", "account")}
            </TableHead>
            <TableHead className="hidden h-10 xl:table-cell">Status</TableHead>
            <TableHead
              className="h-10 w-28 pr-4 text-right sm:pr-5"
              aria-sort={
                sortKey === "amount"
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              {sortButton("Amount", "amount", "right")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageTransactions.length > 0 ? (
            pageTransactions.map((transaction) => {
              const account = accountMap.get(transaction.account)
              const merchant = merchantNameFor(transaction)
              const transactionDateTime = formatTransactionDateTime(
                transaction,
                snapshot.timezone
              )
              const isCredit =
                transaction.direction === "credit" ||
                (transaction.amount?.amount ?? 0) > 0

              return (
                <TableRow
                  key={transaction.id}
                  onClick={() =>
                    setSelectedTransaction(
                      transactionWithMerchantOverrides(transaction)
                    )
                  }
                  className="cursor-pointer"
                >
                  <TableCell className="py-2.5 pl-4 sm:pl-5">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTransaction(
                          transactionWithMerchantOverrides(transaction)
                        )
                      }
                      className="flex w-full items-center gap-2.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4"
                      aria-label={`View details for ${merchant}`}
                    >
                      <MerchantLogo
                        name={merchant}
                        category={transaction.provider_category}
                        src={merchantLogoFor(transaction)}
                      />
                      <div className="min-w-0">
                        <p
                          className="truncate text-xs font-semibold"
                          title={transaction.description}
                        >
                          {merchant}
                        </p>
                        <p className="mt-0.5 truncate text-[0.62rem] text-muted-foreground md:hidden">
                          {formatCategory(transaction.provider_category)}
                        </p>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-[0.65rem] text-muted-foreground tabular-nums">
                    <span className="block text-foreground/80">
                      {transactionDateTime.date}
                    </span>
                    <span className="mt-0.5 block text-[0.58rem]">
                      {transactionDateTime.time ?? "–"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {formatCategory(transaction.provider_category)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {account ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <InstitutionLogo
                          name={
                            preferences.accounts[account.id]?.institutionName ??
                            account.institution.name
                          }
                          src={
                            preferences.accounts[account.id]?.institutionLogo ??
                            account.institution.logo
                          }
                          className="size-7 rounded-md"
                        />
                        <span className="truncate text-xs text-muted-foreground">
                          {accountLabel(account, preferences)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Account
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge
                      variant="outline"
                      className={`h-5 px-1.5 text-[0.55rem] font-medium capitalize ${transactionStatusClassName(
                        transaction.status
                      )}`}
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`pr-4 text-right font-mono text-xs font-semibold tabular-nums sm:pr-5 ${
                      isCredit
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-foreground"
                    }`}
                  >
                    {formatMoney(transaction.amount?.amount)}
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-28 text-center text-xs text-muted-foreground"
              >
                No transactions match those filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 sm:px-5">
        <p className="text-[0.65rem] text-muted-foreground tabular-nums">
          {sortedTransactions.length === 0
            ? "0 transactions"
            : `${pageStart + 1}–${Math.min(
                pageStart + PAGE_SIZE,
                sortedTransactions.length
              )} of ${sortedTransactions.length}`}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[0.65rem] text-muted-foreground tabular-nums">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="rounded-md"
          >
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={currentPage === pageCount}
            aria-label="Next page"
            className="rounded-md"
          >
            <IconChevronRight />
          </Button>
        </div>
      </div>

      <TransactionDetailsSheet
        key={selectedTransaction?.id ?? "closed-transaction-details"}
        transaction={selectedTransaction}
        account={detailAccount}
        accountName={
          detailAccount ? accountLabel(detailAccount, preferences) : "Account"
        }
        institutionName={
          detailAccount
            ? (detailAccountPreference?.institutionName ??
              detailAccount.institution.name)
            : "Bank of Melbourne"
        }
        institutionLogo={
          detailAccount
            ? (detailAccountPreference?.institutionLogo ??
              detailAccount.institution.logo)
            : null
        }
        timezone={snapshot.timezone}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null)
        }}
        onTransactionChange={(transaction) => {
          const key = getMerchantIdentity(transaction).matchKey
          setMerchantOverrides((current) => ({
            ...current,
            [key]: {
              logo: transaction.custom_logo ?? null,
              name: transaction.custom_merchant_name ?? null,
            },
          }))
          setSelectedTransaction(transaction)
        }}
      />
    </section>
  )
}

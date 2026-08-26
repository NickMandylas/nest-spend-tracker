"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconAdjustmentsDollar, IconLoader2 } from "@tabler/icons-react"

import { updateMonthlyBudgets } from "@/app/actions/budgets"
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
import type { MonthlyBudgets } from "@/lib/preferences-types"

export type BudgetCategoryOption = {
  category: string
  label: string
  spent: number
}

function amountValue(amount: number | null | undefined) {
  return amount ? (amount / 100).toFixed(2) : ""
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`))
}

export function BudgetDialog({
  budgets,
  categories,
  compact = false,
  onSaved,
}: {
  budgets: MonthlyBudgets
  categories: BudgetCategoryOption[]
  compact?: boolean
  onSaved?: (budgets: MonthlyBudgets) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [totalValue, setTotalValue] = React.useState(amountValue(budgets.total))
  const [categoryValues, setCategoryValues] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      categories.map((category) => [
        category.category,
        amountValue(budgets.categories[category.category]),
      ])
    )
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setError(null)
      setTotalValue(amountValue(budgets.total))
      setCategoryValues(
        Object.fromEntries(
          categories.map((category) => [
            category.category,
            amountValue(budgets.categories[category.category]),
          ])
        )
      )
    }
  }

  function save(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateMonthlyBudgets(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }

      onSaved?.(result.budgets)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full border border-primary text-primary hover:bg-primary/10 hover:text-primary"
            aria-label="Set monthly spending budgets"
          >
            <IconAdjustmentsDollar className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-md"
          >
            <IconAdjustmentsDollar />
            Manage budgets
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[88svh] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Monthly spending budgets</DialogTitle>
          <DialogDescription>
            Set an overall limit and optional category limits for{" "}
            {monthLabel(budgets.month)}.
          </DialogDescription>
        </DialogHeader>

        <form action={save} className="flex min-h-0 flex-col">
          <input type="hidden" name="month" value={budgets.month} />
          <div className="min-h-0 overflow-y-auto p-4">
            <div className="rounded-xl bg-muted p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="total-monthly-budget">
                    Total monthly budget
                  </Label>
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    All everyday spending combined.
                  </p>
                </div>
                <div className="relative w-32 shrink-0">
                  <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="total-monthly-budget"
                    name="total"
                    type="number"
                    min="0"
                    max="100000000"
                    step="0.01"
                    inputMode="decimal"
                    value={totalValue}
                    onChange={(event) => setTotalValue(event.target.value)}
                    placeholder="0.00"
                    className="h-9 pl-5 text-right font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[0.62rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                Category limits
              </p>
              <div className="mt-2 divide-y divide-border border-y border-border">
                {categories.map((category) => (
                  <div
                    key={category.category}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <Label
                        htmlFor={`budget-${category.category}`}
                        className="truncate"
                      >
                        {category.label}
                      </Label>
                      <p className="mt-0.5 text-[0.62rem] text-muted-foreground tabular-nums">
                        $
                        {(category.spent / 100).toLocaleString("en-AU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        spent this month
                      </p>
                    </div>
                    <div className="relative w-32 shrink-0">
                      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        id={`budget-${category.category}`}
                        name={`category:${category.category}`}
                        type="number"
                        min="0"
                        max="100000000"
                        step="0.01"
                        inputMode="decimal"
                        value={categoryValues[category.category] ?? ""}
                        onChange={(event) =>
                          setCategoryValues((current) => ({
                            ...current,
                            [category.category]: event.target.value,
                          }))
                        }
                        placeholder="No limit"
                        className="h-8 pl-5 text-right font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[0.62rem] text-muted-foreground">
                Leave an amount blank to remove that budget.
              </p>
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
                {isPending && <IconLoader2 className="animate-spin" />}
                {isPending ? "Saving" : "Save budgets"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

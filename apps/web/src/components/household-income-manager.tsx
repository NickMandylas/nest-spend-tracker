"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconCheck,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react"

import {
  deleteHouseholdMember,
  saveHouseholdMember,
} from "@/app/actions/household"
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
import { formatMoney } from "@/lib/finance"
import type {
  HouseholdMemberPreference,
  HouseholdPreference,
} from "@/lib/preferences-types"

function amountValue(amountMinor: number) {
  return (amountMinor / 100).toFixed(2)
}

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
  return letters || "?"
}

function MemberDialog({
  member,
  onSaved,
}: {
  member?: HouseholdMemberPreference
  onSaved: (household: HouseholdPreference) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await saveHouseholdMember(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }

      onSaved(result.household)
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
        {member ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${member.displayName}`}
          >
            <IconEdit />
          </Button>
        ) : (
          <Button type="button" size="sm">
            <IconPlus />
            Add person
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? "Edit person" : "Add a person"}</DialogTitle>
          <DialogDescription>
            Add their regular monthly take-home income. The household total
            updates automatically.
          </DialogDescription>
        </DialogHeader>
        <form action={submit}>
          {member ? (
            <input type="hidden" name="memberId" value={member.id} />
          ) : null}
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`member-name-${member?.id ?? "new"}`}>Name</Label>
              <Input
                id={`member-name-${member?.id ?? "new"}`}
                name="displayName"
                defaultValue={member?.displayName}
                placeholder="Name"
                maxLength={80}
                className="mt-1.5"
                autoFocus
                required
              />
            </div>
            <div>
              <Label htmlFor={`member-income-${member?.id ?? "new"}`}>
                Monthly take-home income
              </Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  id={`member-income-${member?.id ?? "new"}`}
                  name="monthlyTakeHomeIncome"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={
                    member ? amountValue(member.monthlyTakeHomeIncomeMinor) : ""
                  }
                  placeholder="0.00"
                  className="pl-7 font-mono tabular-nums"
                  required
                />
              </div>
              <p className="mt-1.5 text-[0.65rem] leading-relaxed text-muted-foreground">
                Use the amount received after tax and regular deductions.
              </p>
            </div>
            <p
              className="min-h-4 text-[0.65rem] text-destructive"
              aria-live="polite"
            >
              {error}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconCheck />
              )}
              {isPending ? "Saving" : member ? "Save changes" : "Add person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteMemberDialog({
  member,
  onDeleted,
}: {
  member: HouseholdMemberPreference
  onDeleted: (household: HouseholdPreference) => void
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
      formData.set("memberId", member.id)
      const result = await deleteHouseholdMember(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }

      onDeleted(result.household)
      setOpen(false)
      router.refresh()
    })
  }

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
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${member.displayName}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <IconTrash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <IconTrash />
          </AlertDialogMedia>
          <AlertDialogTitle>Remove {member.displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Their income will be removed from the household total. This cannot
            be undone.
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
            {isPending ? "Removing" : "Remove person"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function HouseholdIncomeManager({
  initialHousehold,
}: {
  initialHousehold: HouseholdPreference
}) {
  const [household, setHousehold] = React.useState(initialHousehold)
  const peopleLabel = `${household.members.length} ${
    household.members.length === 1 ? "person" : "people"
  }`

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Household income</CardTitle>
        <CardDescription>
          List each person’s monthly take-home income. Nest uses the combined
          total in household forecasts.
        </CardDescription>
        <CardAction>
          <MemberDialog onSaved={setHousehold} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-primary/7 p-3.5 ring-1 ring-primary/10">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
            <IconWallet className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium text-muted-foreground">
              Total monthly take-home
            </p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight tabular-nums">
              {formatMoney(household.monthlyTakeHomeIncomeMinor, true)}
            </p>
          </div>
          <Badge variant="outline" className="bg-background/70">
            <IconUsers />
            {peopleLabel}
          </Badge>
        </div>

        {household.members.length ? (
          <div className="divide-y divide-border rounded-lg bg-muted/45 px-3">
            {household.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background text-[0.65rem] font-bold text-muted-foreground ring-1 ring-foreground/10">
                  {initials(member.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    {member.displayName}
                  </p>
                  <p className="mt-0.5 text-[0.62rem] text-muted-foreground">
                    Monthly take-home
                  </p>
                </div>
                <p className="font-mono text-xs font-semibold tabular-nums">
                  {formatMoney(member.monthlyTakeHomeIncomeMinor, true)}
                </p>
                <div className="flex items-center">
                  <MemberDialog member={member} onSaved={setHousehold} />
                  <DeleteMemberDialog
                    member={member}
                    onDeleted={setHousehold}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-border bg-muted/25 p-5 text-center">
            <div>
              <IconUsers className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-semibold">No people added yet</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">
                Add someone to build your total household income.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

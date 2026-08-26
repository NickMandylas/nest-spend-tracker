"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconEdit, IconLoader2 } from "@tabler/icons-react"

import { renameAccount } from "@/app/actions/account-preferences"
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

export function AccountNameDialog({
  accountId,
  displayName,
  providerName,
  institutionName,
  onSaved,
}: {
  accountId: string
  displayName: string
  providerName: string
  institutionName: string
  onSaved: (displayName: string) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(displayName)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setName(displayName)
      setError(null)
    }
  }

  function save(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await renameAccount(formData)
      if (!result.ok) {
        setError(result.message)
        return
      }

      onSaved(result.displayName)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="rounded-md"
          aria-label={`Rename ${displayName}`}
        >
          <IconEdit />
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Account name</DialogTitle>
          <DialogDescription>
            Choose the name shown in Nest. Your bank’s original account name is
            kept unchanged.
          </DialogDescription>
        </DialogHeader>

        <form action={save} className="p-4">
          <input type="hidden" name="accountId" value={accountId} />
          <div>
            <Label htmlFor={`display-name-${accountId}`}>Display name</Label>
            <Input
              id={`display-name-${accountId}`}
              name="displayName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={64}
              required
              autoFocus
              className="mt-2 h-10 text-sm"
            />
          </div>

          <div className="mt-4 rounded-xl bg-muted p-3 text-[0.65rem]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bank</span>
              <span className="font-medium">{institutionName}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Original name</span>
              <span className="max-w-[240px] truncate font-mono font-medium">
                {providerName}
              </span>
            </div>
          </div>

          <p
            className="mt-3 min-h-4 text-[0.65rem] text-destructive"
            aria-live="polite"
          >
            {error}
          </p>

          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending && <IconLoader2 className="animate-spin" />}
              {isPending ? "Saving" : "Save name"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const STATUS_COLOURS = {
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  reversed: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  neutral: "border-border bg-muted text-muted-foreground",
} as const

export function transactionStatusClassName(status: string) {
  const normalisedStatus = status.trim().toLowerCase()

  if (["posted", "completed", "settled"].includes(normalisedStatus)) {
    return STATUS_COLOURS.success
  }
  if (["pending", "authorised", "processing"].includes(normalisedStatus)) {
    return STATUS_COLOURS.pending
  }
  if (["failed", "declined", "rejected"].includes(normalisedStatus)) {
    return STATUS_COLOURS.danger
  }
  if (["reversed", "refunded", "cancelled"].includes(normalisedStatus)) {
    return STATUS_COLOURS.reversed
  }

  return STATUS_COLOURS.neutral
}

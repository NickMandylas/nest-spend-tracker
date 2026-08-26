import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react"
import Link from "next/link"

import { RedbarkError } from "@/lib/redbark"

export function DashboardError({ error }: { error: unknown }) {
  const message =
    error instanceof RedbarkError
      ? error.message
      : "The dashboard could not load your banking data."

  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-xl rounded-md border border-border bg-card p-5 sm:p-6">
        <div className="grid size-11 place-items-center rounded-md bg-destructive/10 text-destructive">
          <IconAlertTriangle className="size-5" />
        </div>
        <p className="mt-5 text-[0.62rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Redbark connection
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
          Your ledger is temporarily closed.
        </h1>
        <p className="mt-2 max-w-md text-xs leading-5 text-pretty text-muted-foreground">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </Link>
          <a
            href="https://docs.redbark.com/api-reference/v2/overview"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Redbark API status
            <IconExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </main>
  )
}

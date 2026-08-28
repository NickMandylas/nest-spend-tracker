"use client"

import * as React from "react"
import { IconSparkles } from "@tabler/icons-react"

import { FinanceChatPanel } from "@/components/finance-chat-panel"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

const DESKTOP_CHAT_QUERY = "(min-width: 1024px)"

function subscribeToDesktopLayout(callback: () => void) {
  const media = window.matchMedia(DESKTOP_CHAT_QUERY)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getDesktopLayoutSnapshot() {
  return window.matchMedia(DESKTOP_CHAT_QUERY).matches
}

function getServerDesktopLayoutSnapshot() {
  return true
}

function subscribeToClientRender() {
  return () => undefined
}

function getClientRenderSnapshot() {
  return true
}

function getServerRenderSnapshot() {
  return false
}

function FinanceChatPanelLoading() {
  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-card"
      aria-label="Nest assistant"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-foreground">
            <IconSparkles className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Nest assistant</p>
            <p className="truncate text-[0.6rem] text-muted-foreground">
              Financial workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="size-7 rounded-md bg-muted/45" />
          <span className="size-7 rounded-md bg-muted/45" />
          <span className="size-7 rounded-md bg-muted/45" />
        </div>
      </header>

      <div className="min-h-0 flex-1 p-3">
        <div className="h-full animate-pulse rounded-lg bg-muted/20" />
      </div>

      <div className="shrink-0 p-3 pt-0">
        <div className="h-[4.75rem] rounded-xl border border-input bg-background" />
      </div>
    </aside>
  )
}

export function FinanceChatShell({
  children,
  open,
  onClose,
}: {
  children: React.ReactNode
  open: boolean
  onClose: () => void
}) {
  const isDesktop = React.useSyncExternalStore(
    subscribeToDesktopLayout,
    getDesktopLayoutSnapshot,
    getServerDesktopLayoutSnapshot
  )
  const isClient = React.useSyncExternalStore(
    subscribeToClientRender,
    getClientRenderSnapshot,
    getServerRenderSnapshot
  )

  const content = (
    <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden">
      {children}
    </div>
  )

  return (
    <div className="h-svh overflow-hidden bg-background text-foreground">
      {isDesktop && open ? (
        <ResizablePanelGroup
          id="finance-chat-layout"
          orientation="horizontal"
          className="h-full w-full"
        >
          <ResizablePanel
            id="finance-dashboard-panel"
            defaultSize="72%"
            minSize="52%"
          >
            {content}
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="w-2 shrink-0 bg-transparent after:w-2 hover:after:bg-border/60 focus-visible:ring-0 [&>div]:h-10 [&>div]:w-0.5"
          />

          <ResizablePanel
            id="finance-chat-panel"
            defaultSize="28%"
            minSize="22%"
            maxSize="42%"
          >
            <div className="h-full p-2 pl-0">
              {isClient ? (
                <FinanceChatPanel onClose={onClose} />
              ) : (
                <FinanceChatPanelLoading />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        content
      )}

      {isClient && !isDesktop && open ? (
        <div
          className="fixed inset-0 z-[80] bg-background p-2 animate-in fade-in slide-in-from-right-3 duration-200 sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Nest assistant"
        >
          <FinanceChatPanel onClose={onClose} />
        </div>
      ) : null}
    </div>
  )
}

"use client"

import * as React from "react"

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
  return false
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
              <FinanceChatPanel onClose={onClose} />
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

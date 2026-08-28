"use client"

import * as React from "react"
import {
  Renderer,
  type ActionEvent,
  type OpenUIError,
} from "@openuidev/react-lang"
import {
  openuiChatLibrary,
  ThemeProvider as OpenUIThemeProvider,
  type Theme as OpenUITheme,
} from "@openuidev/react-ui"
import { useTheme } from "next-themes"

const LIGHT_CHART_PALETTE = [
  "#0891b2",
  "#ea580c",
  "#7c3aed",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#db2777",
  "#475569",
]

const DARK_CHART_PALETTE = [
  "#22d3ee",
  "#fb923c",
  "#a78bfa",
  "#60a5fa",
  "#22c55e",
  "#fbbf24",
  "#f472b6",
  "#94a3b8",
]

const LIGHT_OPENUI_THEME: OpenUITheme = {
  defaultChartPalette: LIGHT_CHART_PALETTE,
}

const DARK_OPENUI_THEME: OpenUITheme = {
  defaultChartPalette: DARK_CHART_PALETTE,
}

const OPENUI_FENCE = /^```(?:openui(?:-lang)?|ui)?[\t ]*\n?/i
const INLINE_DATA_URL = /data:[a-z]+\/[a-z0-9.+-]+(?:;[^,\s"']*)?,/i

export function extractOpenUIProgram(
  content: string,
  allowStreamingPrefix = false
) {
  let program = content.trimStart()
  if (program.startsWith("```")) program = program.replace(OPENUI_FENCE, "")
  const hasRoot = /^root\s*=/i.test(program)
  const isStreamingPrefix =
    allowStreamingPrefix &&
    /^(?:|r|ro|roo|root(?:\s*(?:=\s*[A-Za-z]*)?)?)$/i.test(program)

  if (!hasRoot && !isStreamingPrefix) return null

  return program.replace(/\n?```\s*$/, "").trimEnd()
}

export function OpenUIMessage({
  content,
  isStreaming,
  onAction,
}: {
  content: string
  isStreaming: boolean
  onAction: (event: ActionEvent) => void
}) {
  const { resolvedTheme } = useTheme()
  const [hasErrors, setHasErrors] = React.useState(false)
  const program = extractOpenUIProgram(content, isStreaming)
  const containsInlineDataUrl = program ? INLINE_DATA_URL.test(program) : false

  const handleErrors = React.useCallback((errors: OpenUIError[]) => {
    const nextHasErrors = errors.length > 0
    setHasErrors((currentHasErrors) =>
      currentHasErrors === nextHasErrors ? currentHasErrors : nextHasErrors
    )
  }, [])

  if (!program) return null

  // Uploaded files already have a first-class transcript preview. Rendering
  // model-echoed data URLs is both redundant and unsafe while streaming: every
  // partial base64 prefix would otherwise mount as a broken image and emit a
  // browser error. The agent prompt also forbids producing these going forward.
  if (containsInlineDataUrl) {
    return isStreaming ? (
      <div
        className="nest-openui min-w-0 overflow-hidden px-3"
        data-openui-message
        data-openui-streaming="true"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="nest-openui-stream-status" role="status">
          <span className="nest-openui-stream-dot" aria-hidden="true" />
          <span>Composing view…</span>
        </div>
      </div>
    ) : null
  }

  return (
    <div
      className="nest-openui min-w-0 overflow-hidden px-3"
      data-openui-message
      data-openui-streaming={isStreaming ? "true" : undefined}
      aria-busy={isStreaming}
      aria-live="polite"
    >
      <OpenUIThemeProvider
        mode={resolvedTheme === "dark" ? "dark" : "light"}
        lightTheme={LIGHT_OPENUI_THEME}
        darkTheme={DARK_OPENUI_THEME}
        cssSelector=".nest-openui"
      >
        <Renderer
          library={openuiChatLibrary}
          response={program}
          isStreaming={isStreaming}
          onAction={onAction}
          onError={handleErrors}
          publishObservability={false}
        />
      </OpenUIThemeProvider>
      {isStreaming ? (
        <div className="nest-openui-stream-status" role="status">
          <span className="nest-openui-stream-dot" aria-hidden="true" />
          <span>Composing view…</span>
        </div>
      ) : null}
      {!isStreaming && hasErrors ? (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-[0.62rem] leading-relaxed text-pretty text-destructive">
          This interactive response could not be fully rendered. Ask Nest to
          retry it.
        </p>
      ) : null}
    </div>
  )
}

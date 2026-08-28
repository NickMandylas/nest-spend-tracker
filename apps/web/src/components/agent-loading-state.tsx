"use client"

import * as React from "react"

const CHEVRON_DELAYS = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3)
  const column = index % 3
  return (column + Math.abs(row - 1)) * 90
})

function useElapsedTime() {
  const startedAt = React.useRef<number | null>(null)
  const [elapsedMs, setElapsedMs] = React.useState(0)

  React.useEffect(() => {
    startedAt.current = performance.now()
    const updateElapsed = () => {
      if (startedAt.current === null) return
      setElapsedMs(performance.now() - startedAt.current)
    }
    const interval = window.setInterval(updateElapsed, 100)
    updateElapsed()

    return () => window.clearInterval(interval)
  }, [])

  const totalSeconds = elapsedMs / 1_000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`

  const minutes = Math.floor(totalSeconds / 60)
  return `${minutes}m ${(totalSeconds % 60).toFixed(1)}s`
}

export function AgentLoadingState({ label }: { label: string }) {
  const elapsed = useElapsedTime()

  return (
    <div
      aria-label={`${label}. Still working.`}
      className="flex w-fit items-center gap-2 px-3 py-0.5 text-muted-foreground"
      role="status"
    >
      <span
        aria-hidden="true"
        className="grid shrink-0 grid-cols-[repeat(3,3px)] gap-[1.5px]"
      >
        {CHEVRON_DELAYS.map((delay, index) => (
          <span
            className="nest-agent-loader-cell size-[3px] rounded-[0.75px] bg-current"
            key={index}
            style={
              {
                "--nest-agent-loader-delay": `${delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      <span className="nest-agent-trace-shimmer text-[0.62rem] font-medium">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="font-mono text-[0.56rem] tabular-nums text-muted-foreground/70"
      >
        {elapsed}
      </span>
    </div>
  )
}

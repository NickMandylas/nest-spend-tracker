"use client"

import * as React from "react"
import type { EveDynamicToolPart, EveMessagePart } from "eve/client"
import { Streamdown } from "streamdown"
import {
  IconChevronDown,
  IconSparkles,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"

const TOOL_LABELS: Record<string, string> = {
  get_household_overview: "Read household overview",
  get_spending_summary: "Summarise spending",
  search_transactions: "Search transactions",
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  get_household_overview: "Balances, budgets, property, loan and net worth",
  get_spending_summary: "Everyday spending from the local cache",
  search_transactions: "Matching transactions from the local cache",
}

type ReasoningPart = Extract<EveMessagePart, { type: "reasoning" }>

export type AgentActivityPart = ReasoningPart | EveDynamicToolPart

function IconlyDatabaseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.42188 6V11.9997C4.42188 11.9997 4.42188 14.9994 12.0005 14.9994C19.5792 14.9994 19.5792 11.9997 19.5792 11.9997V6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M4.42188 12V17.9996C4.42188 17.9996 4.42188 21.0004 12.0005 21.0004C19.5792 21.0004 19.5792 17.9996 19.5792 17.9996V12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <ellipse
        cx="12.0005"
        cy="6.01883"
        rx="7.57866"
        ry="3.01883"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function isAgentActivityPart(
  part: EveMessagePart
): boolean {
  if (part.type === "reasoning") return true
  if (part.type !== "dynamic-tool") return false

  return (
    part.toolName !== "ask_question" &&
    part.toolMetadata?.eve?.inputRequest?.kind !== "question"
  )
}

function toolInputSummary(part: EveDynamicToolPart) {
  if (!part.input || typeof part.input !== "object") {
    return TOOL_DESCRIPTIONS[part.toolName] ?? "Local workspace data"
  }

  const input = part.input as Record<string, unknown>
  if (part.toolName === "get_spending_summary") {
    const period =
      typeof input.period === "string"
        ? input.period.replaceAll("_", " ")
        : "current month"
    const groupBy =
      typeof input.groupBy === "string" ? ` · by ${input.groupBy}` : ""
    return `${period}${groupBy}`
  }

  if (part.toolName === "search_transactions") {
    const details = [
      typeof input.query === "string" ? `“${input.query}”` : null,
      typeof input.accountName === "string" ? input.accountName : null,
      typeof input.category === "string" ? input.category : null,
      typeof input.dateFrom === "string" && typeof input.dateTo === "string"
        ? `${input.dateFrom}–${input.dateTo}`
        : null,
    ].filter(Boolean)

    return details.join(" · ") || TOOL_DESCRIPTIONS[part.toolName]
  }

  return TOOL_DESCRIPTIONS[part.toolName] ?? "Local workspace data"
}

function isToolWorking(part: EveDynamicToolPart) {
  return (
    part.state === "input-streaming" ||
    part.state === "input-available" ||
    (part.state === "output-available" && part.partial === true)
  )
}

function isToolWaiting(part: EveDynamicToolPart) {
  return (
    part.state === "approval-requested" ||
    part.state === "approval-responded"
  )
}

function isToolFailed(part: EveDynamicToolPart) {
  return part.state === "output-error" || part.state === "output-denied"
}

function toolStatus(part: EveDynamicToolPart) {
  if (isToolFailed(part)) {
    return part.state === "output-denied" ? "Denied" : "Failed"
  }
  if (isToolWaiting(part)) return "Waiting"
  if (isToolWorking(part)) return "Running"
  return "Complete"
}

function TraceMarkdown({ part }: { part: ReasoningPart }) {
  const streaming = part.state === "streaming"

  return (
    <Streamdown
      animated={
        streaming
          ? {
              animation: "fadeIn",
              duration: 120,
              maxBacklogMs: 160,
              stagger: 7,
            }
          : false
      }
      caret="circle"
      className="min-w-0 text-[0.62rem] text-muted-foreground [&_blockquote]:my-1 [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-2 [&_h1]:my-0.5 [&_h1]:text-[0.65rem] [&_h2]:my-0.5 [&_h2]:text-[0.65rem] [&_h3]:my-0.5 [&_h3]:text-[0.63rem] [&_li]:text-pretty [&_ol]:my-0.5 [&_p]:my-0.5 [&_p]:leading-relaxed [&_p]:text-pretty [&_pre]:my-1 [&_pre]:text-[0.58rem] [&_ul]:my-0.5"
      isAnimating={streaming}
      linkSafety={{ enabled: true }}
      mode={streaming ? "streaming" : "static"}
      parseIncompleteMarkdown
    >
      {part.text}
    </Streamdown>
  )
}

function ToolActivityRow({ part }: { part: EveDynamicToolPart }) {
  const working = isToolWorking(part)
  const waiting = isToolWaiting(part)
  const failed = isToolFailed(part)
  const complete = !working && !waiting && !failed

  return (
    <div
      className="w-full py-1"
      data-tool-state={part.state}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <IconlyDatabaseIcon className="mt-[0.1rem] size-3 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="min-w-0 truncate text-[0.64rem] leading-snug font-medium text-foreground">
              {TOOL_LABELS[part.toolName] ?? part.toolName}
            </p>
            {!complete ? (
              <span
                className={cn(
                  "ml-auto shrink-0 text-[0.54rem] font-medium",
                  failed ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {toolStatus(part)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[0.56rem] leading-relaxed text-muted-foreground">
            {toolInputSummary(part)}
          </p>
          {part.state === "output-error" ? (
            <p className="mt-1 text-[0.56rem] leading-relaxed text-pretty text-destructive">
              {part.errorText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function AgentActivityTrace({
  parts,
}: {
  parts: readonly AgentActivityPart[]
}) {
  const working = parts.some((part) =>
    part.type === "reasoning"
      ? part.state === "streaming"
      : isToolWorking(part)
  )
  const waiting = parts.some(
    (part) => part.type === "dynamic-tool" && isToolWaiting(part)
  )
  const failed = parts.some(
    (part) => part.type === "dynamic-tool" && isToolFailed(part)
  )
  const toolCount = parts.filter(
    (part) => part.type === "dynamic-tool"
  ).length
  const autoExpanded = working || waiting
  const [manualExpanded, setManualExpanded] = React.useState<boolean | null>(
    null
  )
  const expanded = manualExpanded ?? autoExpanded
  const state = working ? "working" : waiting ? "waiting" : "complete"
  const settledLabel = failed
    ? "Completed with an issue"
    : toolCount > 0
      ? `Ran ${toolCount} ${toolCount === 1 ? "tool" : "tools"}`
      : "Thought through response"

  return (
    <section
      className="flex w-full max-w-[23.75rem] flex-col px-3"
      data-agent-trace-state={state}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() =>
          setManualExpanded((current) => !(current ?? autoExpanded))
        }
        className="flex w-fit max-w-full items-center gap-1.5 rounded-md py-0.5 text-left transition-colors duration-150 hover:bg-muted/55"
      >
        <IconSparkles
          className={cn(
            "size-3.5 shrink-0",
            working ? "text-foreground" : "text-muted-foreground"
          )}
        />
        <span role="status" className="min-w-0">
          {working ? (
            <span className="nest-agent-trace-shimmer block truncate text-[0.65rem] font-medium">
              Thinking
            </span>
          ) : (
            <span className="block truncate text-[0.65rem] font-medium text-muted-foreground">
              {waiting ? "Waiting for approval" : settledLabel}
            </span>
          )}
        </span>
        <IconChevronDown
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-300",
            expanded && "rotate-180"
          )}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-1 ml-[0.42rem] border-l border-border/70 pl-[0.9rem]">
            <div className="flex flex-col gap-1.5 py-0.5">
              {parts.map((part, index) => (
                <div
                  key={
                    part.type === "dynamic-tool"
                      ? part.toolCallId
                      : `reasoning-${part.stepIndex ?? 0}-${index}`
                  }
                  className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                  style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}
                >
                  {part.type === "reasoning" ? (
                    <div className="min-w-0 py-1">
                      <TraceMarkdown part={part} />
                    </div>
                  ) : (
                    <ToolActivityRow part={part} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import * as React from "react"
import type { EveDynamicToolPart, EveMessagePart } from "eve/client"
import { Streamdown } from "streamdown"
import { IconChevronDown, IconSparkles } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

const TOOL_LABELS: Record<string, string> = {
  get_household_overview: "Read household overview",
  get_spending_summary: "Summarise spending",
  search_transactions: "Search transactions",
  web_scrape: "Read web page",
  web_search: "Search the web",
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  get_household_overview: "Balances, budgets, property, loan and net worth",
  get_spending_summary: "Everyday spending from the local cache",
  search_transactions: "Matching transactions from the local cache",
  web_scrape: "Public page content via Firecrawl",
  web_search: "Current public sources via Firecrawl",
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

function IconlyLoadingIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        clipRule="evenodd"
        d="M6.37107 15.0765L4.64907 16.7985C4.25907 17.1895 4.25907 17.8225 4.64907 18.2125C4.84507 18.4085 5.10007 18.5055 5.35607 18.5055C5.61207 18.5055 5.86807 18.4085 6.06307 18.2125L7.78507 16.4905C8.17607 16.0995 8.17607 15.4665 7.78507 15.0765C7.39407 14.6855 6.76207 14.6855 6.37107 15.0765Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <path
        clipRule="evenodd"
        d="M6.83585 4.84133C6.44485 4.45133 5.81285 4.45133 5.42185 4.84133C5.03085 5.23233 5.03085 5.86533 5.42185 6.25633L6.37085 7.20533C6.56585 7.40033 6.82185 7.49733 7.07785 7.49733C7.33385 7.49733 7.58985 7.40033 7.78485 7.20433C8.17585 6.81433 8.17585 6.18033 7.78485 5.79033L6.83585 4.84133Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <path
        clipRule="evenodd"
        d="M17.0703 15.0765C16.6793 14.6855 16.0473 14.6855 15.6563 15.0765C15.2653 15.4665 15.2653 16.0995 15.6563 16.4905L17.3783 18.2125C17.5733 18.4085 17.8293 18.5055 18.0853 18.5055C18.3413 18.5055 18.5963 18.4085 18.7923 18.2125C19.1823 17.8225 19.1823 17.1895 18.7923 16.7985L17.0703 15.0765Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <g fill="currentColor" opacity="0.4">
        <path d="M11.7207 16.707C11.1677 16.707 10.7207 17.155 10.7207 17.707V20.141C10.7207 20.693 11.1677 21.141 11.7207 21.141C12.2737 21.141 12.7207 20.693 12.7207 20.141V17.707C12.7207 17.155 12.2737 16.707 11.7207 16.707Z" />
        <path d="M20.7207 10.1406H18.2867C17.7347 10.1406 17.2867 10.5886 17.2867 11.1406C17.2867 11.6926 17.7347 12.1406 18.2867 12.1406H20.7207C21.2737 12.1406 21.7207 11.6926 21.7207 11.1406C21.7207 10.5886 21.2737 10.1406 20.7207 10.1406Z" />
        <path d="M6.1543 11.1406C6.1543 10.5886 5.7073 10.1406 5.1543 10.1406H3.2793C2.7263 10.1406 2.2793 10.5886 2.2793 11.1406C2.2793 11.6926 2.7263 12.1406 3.2793 12.1406H5.1543C5.7073 12.1406 6.1543 11.6926 6.1543 11.1406Z" />
        <path d="M11.7207 2.85742C11.1677 2.85742 10.7207 3.30542 10.7207 3.85742V4.57542C10.7207 5.12842 11.1677 5.57542 11.7207 5.57542C12.2737 5.57542 12.7207 5.12842 12.7207 4.57542V3.85742C12.7207 3.30542 12.2737 2.85742 11.7207 2.85742Z" />
      </g>
    </svg>
  )
}

export function isAgentActivityPart(part: EveMessagePart): boolean {
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

  if (part.toolName === "web_search") {
    return typeof input.query === "string"
      ? `“${input.query}”`
      : TOOL_DESCRIPTIONS[part.toolName]
  }

  if (part.toolName === "web_scrape") {
    return typeof input.url === "string"
      ? input.url
      : TOOL_DESCRIPTIONS[part.toolName]
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
    part.state === "approval-requested" || part.state === "approval-responded"
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
    <div className="w-full py-1" data-tool-state={part.state}>
      <div className="flex min-w-0 items-start gap-1.5">
        <IconlyDatabaseIcon className="mt-[0.1rem] size-3 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="min-w-0 truncate text-[0.64rem] leading-snug font-medium text-foreground">
              {TOOL_LABELS[part.toolName] ?? part.toolName}
            </p>
            {working ? (
              <span
                aria-label="Running"
                className="ml-auto grid size-3.5 shrink-0 place-items-center text-muted-foreground"
                role="status"
              >
                <IconlyLoadingIcon className="size-3 animate-spin motion-reduce:animate-none" />
              </span>
            ) : !complete ? (
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
  turnActive = false,
}: {
  parts: readonly AgentActivityPart[]
  turnActive?: boolean
}) {
  const working = parts.some((part) =>
    part.type === "reasoning" ? part.state === "streaming" : isToolWorking(part)
  )
  const waiting = parts.some(
    (part) => part.type === "dynamic-tool" && isToolWaiting(part)
  )
  const failed = parts.some(
    (part) => part.type === "dynamic-tool" && isToolFailed(part)
  )
  const toolCount = parts.filter((part) => part.type === "dynamic-tool").length
  const autoExpanded = turnActive || working || waiting
  const [manualExpanded, setManualExpanded] = React.useState<boolean | null>(
    null
  )
  const expanded = turnActive || (manualExpanded ?? autoExpanded)
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
        disabled={turnActive}
        onClick={() => {
          if (turnActive) return
          setManualExpanded((current) => !(current ?? autoExpanded))
        }}
        className="flex w-fit max-w-full items-center gap-1.5 rounded-md py-0.5 text-left transition-colors duration-150 hover:bg-muted/55 disabled:cursor-default disabled:hover:bg-transparent"
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
                  className="animate-in duration-300 fade-in slide-in-from-bottom-1"
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

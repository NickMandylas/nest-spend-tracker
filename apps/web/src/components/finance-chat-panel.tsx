"use client"

import * as React from "react"
import type { ActionEvent } from "@openuidev/react-lang"
import type {
  ClientSessionState,
  EveDynamicToolPart,
  EveMessagePart,
  MessageStreamEvent,
  SendTurnOptions,
} from "eve/client"
import { useEveAgent } from "eve/react"
import { useTheme } from "next-themes"
import { Streamdown } from "streamdown"
import {
  IconArrowUp,
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconDatabaseSearch,
  IconExclamationCircle,
  IconHistory,
  IconPaperclip,
  IconPlayerStop,
  IconPlus,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"

import { Aurora } from "@/components/aurora"
import {
  extractOpenUIProgram,
  OpenUIMessage,
} from "@/components/openui-message"
import { Button } from "@/components/ui/button"

const LIGHT_AURORA = ["#c2410c", "#7c3aed", "#9a3412"] as const
const DARK_AURORA = ["#a0d2db", "#88b4e7", "#c4a7e7"] as const
const CHAT_STORAGE_KEY = "nest-eve-chat-v1"

const SUGGESTIONS = [
  "Where did most of our money go this month?",
  "How is the offset changing our payoff date?",
  "What should we budget for next month?",
]

type SavedChat = {
  events?: readonly MessageStreamEvent[]
  session?: ClientSessionState
}

function readSavedChat(): SavedChat {
  if (typeof window === "undefined") return {}

  try {
    const saved = window.localStorage.getItem(CHAT_STORAGE_KEY)
    return saved ? (JSON.parse(saved) as SavedChat) : {}
  } catch {
    return {}
  }
}

function saveChat(value: SavedChat) {
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // The live session still works when private browsing blocks local storage.
  }
}

function hasPendingAuthorization(events: readonly MessageStreamEvent[]) {
  const pending = new Set<string>()

  for (const event of events) {
    if (
      event.type === "authorization.required" &&
      event.data.webhookUrl !== undefined
    ) {
      pending.add(event.data.name)
    } else if (event.type === "authorization.completed") {
      pending.delete(event.data.name)
    }
  }

  return pending.size > 0
}

function shouldResumeSavedChat(saved: SavedChat) {
  if (saved.session === undefined) return false

  const events = saved.events ?? []
  const tail = events.at(-1)
  if (tail === undefined) return true

  if (tail.type === "session.completed" || tail.type === "session.failed") {
    return false
  }

  if (tail.type === "session.waiting") {
    return hasPendingAuthorization(events)
  }

  return true
}

function ChatStream({
  children,
  className = "text-foreground",
  compact = false,
  streaming = false,
}: {
  children: string
  className?: string
  compact?: boolean
  streaming?: boolean
}) {
  return (
    <Streamdown
      animated={
        streaming
          ? {
              animation: "fadeIn",
              duration: 140,
              maxBacklogMs: 180,
              stagger: 8,
            }
          : false
      }
      caret="circle"
      className={`min-w-0 ${className} ${
        compact ? "text-[0.62rem]" : "text-[0.72rem]"
      } [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-xs [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-[0.7rem] [&_h2]:font-semibold [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-[0.66rem] [&_h3]:font-semibold [&_li]:text-pretty [&_ol]:my-1.5 [&_p]:leading-relaxed [&_p]:text-pretty [&_pre]:text-[0.6rem] [&_table]:text-[0.6rem] [&_ul]:my-1.5`}
      isAnimating={streaming}
      linkSafety={{ enabled: true }}
      mode={streaming ? "streaming" : "static"}
      parseIncompleteMarkdown
      tableMaxHeight={240}
    >
      {children}
    </Streamdown>
  )
}

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

function toolInputSummary(part: EveDynamicToolPart) {
  if (!part.input || typeof part.input !== "object") {
    return TOOL_DESCRIPTIONS[part.toolName] ?? "Read-only local data"
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

  return TOOL_DESCRIPTIONS[part.toolName] ?? "Read-only local data"
}

function ToolCallTrace({ part }: { part: EveDynamicToolPart }) {
  const complete = part.state === "output-available"
  const failed = part.state === "output-error" || part.state === "output-denied"
  const waiting =
    part.state === "approval-requested" || part.state === "approval-responded"
  const status = complete
    ? "Complete"
    : failed
      ? part.state === "output-denied"
        ? "Denied"
        : "Failed"
      : waiting
        ? "Waiting"
        : "Running"

  return (
    <div
      className="flex w-full items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5 text-muted-foreground"
      data-tool-state={part.state}
    >
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ${
          failed
            ? "bg-destructive/10 text-destructive"
            : complete
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-background text-foreground"
        }`}
      >
        {failed ? (
          <IconExclamationCircle className="size-3" />
        ) : complete ? (
          <IconCheck className="size-3" />
        ) : (
          <IconDatabaseSearch className="size-3 animate-pulse" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[0.65rem] font-medium text-foreground">
            {TOOL_LABELS[part.toolName] ?? part.toolName}
          </p>
          <span
            className={`shrink-0 text-[0.56rem] font-medium ${
              failed
                ? "text-destructive"
                : complete
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
            }`}
          >
            {status}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[0.58rem] text-muted-foreground">
          {toolInputSummary(part)}
        </p>
        {part.state === "output-error" ? (
          <p className="mt-1 text-[0.58rem] text-pretty text-destructive">
            {part.errorText}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ReasoningTrace({
  part,
}: {
  part: Extract<EveMessagePart, { type: "reasoning" }>
}) {
  const isStreaming = part.state === "streaming"
  const [open, setOpen] = React.useState(isStreaming)

  return (
    <details
      className="group rounded-lg bg-muted/35 px-3 py-2.5 text-muted-foreground"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 text-[0.62rem] font-medium text-foreground [&::-webkit-details-marker]:hidden"
        title="Model-provided reasoning summary"
      >
        <IconBrain className="size-3.5 text-muted-foreground" />
        <span>Reasoning summary</span>
        {isStreaming ? (
          <span className="ml-auto text-[0.55rem] font-normal text-muted-foreground">
            Thinking…
          </span>
        ) : (
          <IconChevronDown className="ml-auto size-3 transition-transform duration-150 ease-out group-open:rotate-180" />
        )}
      </summary>
      <div className="mt-1.5">
        <ChatStream compact streaming={part.state === "streaming"}>
          {part.text}
        </ChatStream>
      </div>
    </details>
  )
}

function MessagePart({
  part,
  isUser = false,
  onOpenUIAction,
}: {
  part: EveMessagePart
  isUser?: boolean
  onOpenUIAction: (event: ActionEvent) => void
}) {
  if (part.type === "text") {
    if (
      !isUser &&
      extractOpenUIProgram(part.text, part.state === "streaming") !== null
    ) {
      return (
        <OpenUIMessage
          content={part.text}
          isStreaming={part.state === "streaming"}
          onAction={onOpenUIAction}
        />
      )
    }

    return (
      <ChatStream
        className={isUser ? "text-background" : "text-foreground"}
        streaming={part.state === "streaming"}
      >
        {part.text}
      </ChatStream>
    )
  }

  if (part.type === "reasoning") {
    return (
      <ReasoningTrace
        key={part.state === "streaming" ? "streaming" : "complete"}
        part={part}
      />
    )
  }
  if (part.type === "dynamic-tool") return <ToolCallTrace part={part} />
  return null
}

export function FinanceChatPanel({ onClose }: { onClose: () => void }) {
  const { resolvedTheme } = useTheme()
  const [draft, setDraft] = React.useState("")
  const [saved] = React.useState<SavedChat>(readSavedChat)
  const conversationRef = React.useRef<HTMLDivElement>(null)
  const colors = resolvedTheme === "dark" ? DARK_AURORA : LIGHT_AURORA

  const agent = useEveAgent({
    initialEvents: saved.events ?? [],
    initialSession: saved.session,
    resume: shouldResumeSavedChat(saved),
    onSessionChange(session) {
      const current = readSavedChat()
      saveChat({ events: current.events, session })
    },
    onFinish(snapshot) {
      saveChat({ events: snapshot.events, session: snapshot.session })
    },
  })

  const isBusy = agent.status === "submitted" || agent.status === "streaming"
  const messages = agent.data.messages
  const hasMessages = messages.length > 0

  React.useEffect(() => {
    const conversation = conversationRef.current
    if (conversation) conversation.scrollTop = conversation.scrollHeight
  }, [messages, agent.status])

  const sendMessage = React.useCallback(
    (value: string, clientContext?: SendTurnOptions["clientContext"]) => {
      const message = value.trim()
      if (!message) return

      setDraft("")
      void agent
        .send(message, {
          ...(isBusy ? { turnPolicy: "steer" as const } : {}),
          ...(clientContext ? { clientContext } : {}),
        })
        .catch(() => {})
    },
    [agent, isBusy]
  )

  const handleOpenUIAction = React.useCallback(
    (event: ActionEvent) => {
      if (event.type === "open_url") {
        const value = event.params.url
        if (typeof value !== "string") return

        try {
          const url = new URL(value, window.location.href)
          if (url.protocol !== "http:" && url.protocol !== "https:") return
          window.open(url, "_blank", "noopener,noreferrer")
        } catch {
          // Ignore malformed model-generated URLs.
        }
        return
      }

      sendMessage(
        event.humanFriendlyMessage,
        JSON.stringify({
          openui: {
            type: event.type,
            params: event.params,
            formName: event.formName,
            formState: event.formState,
          },
        })
      )
    },
    [sendMessage]
  )

  const startNewChat = () => {
    window.localStorage.removeItem(CHAT_STORAGE_KEY)
    agent.reset()
    setDraft("")
  }

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

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md transition-[background-color,scale] duration-150 ease-out active:scale-[0.96]"
            onClick={startNewChat}
            disabled={isBusy}
            title="Start a new chat"
            aria-label="Start a new chat"
          >
            <IconPlus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md transition-[background-color,scale] duration-150 ease-out active:scale-[0.96]"
            disabled
            title="Chat history will be available later"
            aria-label="Chat history is not available yet"
          >
            <IconHistory />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md transition-[background-color,scale] duration-150 ease-out active:scale-[0.96]"
            onClick={onClose}
            title="Close assistant"
            aria-label="Close assistant"
          >
            <IconX />
          </Button>
        </div>
      </header>

      <div
        ref={conversationRef}
        className="relative min-h-0 flex-1 overflow-y-auto"
      >
        {!hasMessages ? (
          <div className="relative flex min-h-full flex-col justify-end overflow-hidden p-3">
            <div
              className="absolute inset-x-0 top-0 h-44 overflow-hidden"
              style={{
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 58%, transparent 100%)",
              }}
            >
              <Aurora
                colorStops={colors}
                amplitude={1}
                blend={0.5}
                speed={0.5}
              />
            </div>

            <div className="relative z-10">
              <div className="mb-3 space-y-0.5">
                <p className="text-sm font-semibold text-balance">
                  Ask about your money.
                </p>
                <p className="text-[0.68rem] leading-relaxed text-pretty text-muted-foreground">
                  Explore spending, budgets, your offset and the property-loan
                  forecast in one conversation.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="group flex min-h-10 items-center gap-2 rounded-lg bg-muted/55 px-3 py-2 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-muted active:scale-[0.96]"
                  >
                    <IconArrowUp className="size-3.5 shrink-0 rotate-45 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" />
                    <span className="text-[0.68rem] leading-snug text-pretty text-muted-foreground group-hover:text-foreground">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-full flex-col gap-4 px-3.5 py-4">
            {messages.map((message) => {
              const visibleParts = message.parts.filter(
                (part) =>
                  part.type === "text" ||
                  part.type === "reasoning" ||
                  part.type === "dynamic-tool"
              )

              if (visibleParts.length === 0) return null

              return (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-8 max-w-[88%] self-end rounded-lg bg-foreground px-3.5 py-2.5 text-background"
                      : "w-full space-y-2.5 self-start pr-2"
                  }
                >
                  {visibleParts.map((part, index) => (
                    <MessagePart
                      key={
                        part.type === "dynamic-tool"
                          ? part.toolCallId
                          : `${part.type}-${
                              "stepIndex" in part ? (part.stepIndex ?? 0) : 0
                            }-${index}`
                      }
                      part={part}
                      isUser={message.role === "user"}
                      onOpenUIAction={handleOpenUIAction}
                    />
                  ))}
                </div>
              )
            })}

            {agent.status === "submitted" ? (
              <div className="mr-3 flex items-center gap-1.5 self-start text-[0.62rem] text-muted-foreground">
                <IconSparkles className="size-3 animate-pulse" />
                <span>Thinking…</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 pt-0">
        {agent.error ? (
          <p className="mb-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-[0.62rem] text-destructive">
            {agent.error.message}
          </p>
        ) : null}

        <form
          className="rounded-xl border border-input bg-background p-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25"
          onSubmit={(event) => {
            event.preventDefault()
            sendMessage(draft)
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                sendMessage(draft)
              }
            }}
            placeholder="Ask Nest anything…"
            className="min-h-14 w-full resize-none bg-transparent px-2 py-1.5 text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-end justify-between gap-2 px-0.5 pb-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              className="rounded-lg"
              title="Attachments are not available yet"
              aria-label="Attachments are not available yet"
            >
              <IconPaperclip />
            </Button>
            <Button
              type={isBusy ? "button" : "submit"}
              size="icon-sm"
              className="rounded-full"
              disabled={!isBusy && !draft.trim()}
              onClick={
                isBusy
                  ? () => {
                      void agent.cancel().catch(() => {})
                    }
                  : undefined
              }
              title={isBusy ? "Stop response" : "Send message"}
              aria-label={isBusy ? "Stop response" : "Send message"}
            >
              {isBusy ? <IconPlayerStop /> : <IconArrowUp />}
            </Button>
          </div>
        </form>
      </div>
    </aside>
  )
}

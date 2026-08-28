"use client"

import * as React from "react"
import type { ActionEvent } from "@openuidev/react-lang"
import type {
  ClientSessionState,
  EveDynamicToolPart,
  EveMessageInputRequest,
  EveMessagePart,
  InputResponse,
  MessageStreamEvent,
  SendTurnOptions,
} from "eve/client"
import { useEveAgent } from "eve/react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useTheme } from "next-themes"
import { Streamdown } from "streamdown"
import {
  IconArrowUp,
  IconCheck,
  IconHistory,
  IconMessageQuestion,
  IconPaperclip,
  IconPlayerStop,
  IconPlus,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"

import {
  AgentActivityTrace,
  type AgentActivityPart,
  isAgentActivityPart,
} from "@/components/agent-activity-trace"
import { AgentLoadingState } from "@/components/agent-loading-state"
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

const ACTIVE_TOOL_LABELS: Record<string, string> = {
  get_household_overview: "Reading household data",
  get_spending_summary: "Summarising spending",
  search_transactions: "Searching transactions",
  web_scrape: "Reading web source",
  web_search: "Searching the web",
}

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

function activeWorkLabel(
  messages: readonly { parts: readonly EveMessagePart[] }[],
  status: "submitted" | "streaming"
) {
  if (status === "submitted") return "Starting response"

  const parts = messages.flatMap((message) => message.parts)
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]
    if (part.type === "reasoning" && part.state === "streaming") {
      return "Reasoning"
    }
    if (part.type === "text" && part.state === "streaming") {
      return "Writing response"
    }
    if (
      part.type === "dynamic-tool" &&
      (part.state === "input-streaming" ||
        part.state === "input-available" ||
        (part.state === "output-available" && part.partial === true))
    ) {
      return ACTIVE_TOOL_LABELS[part.toolName] ?? "Running tool"
    }
  }

  return "Waiting for next update"
}

function activeTurnKey(
  messages: readonly { id: string; role: string }[],
  fallback: string
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") return messages[index].id
  }

  return fallback
}

function activeAssistantMessageId(
  messages: readonly { id: string; role: string }[],
  isBusy: boolean
) {
  if (!isBusy) return null

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role === "assistant") return message.id
    if (message.role === "user") return null
  }

  return null
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

type AgentInputResponse = {
  readonly optionId?: string
  readonly requestId: string
  readonly text?: string
}

function isPendingQuestionPart(part: EveMessagePart): boolean {
  return (
    part.type === "dynamic-tool" &&
    part.state === "approval-requested" &&
    part.toolMetadata?.eve?.inputRequest?.kind === "question" &&
    part.toolMetadata.eve.inputResponse === undefined
  )
}

function QuestionRequest({
  canRespond,
  inputRequest,
  inputResponse,
  onInputResponses,
  placement = "message",
}: {
  canRespond: boolean
  inputRequest: EveMessageInputRequest
  inputResponse?: InputResponse
  onInputResponses: (
    responses: readonly AgentInputResponse[]
  ) => void | Promise<void>
  placement?: "composer" | "message"
}) {
  const [selectedOptionId, setSelectedOptionId] = React.useState("")
  const [freeform, setFreeform] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const hasOptions = (inputRequest.options?.length ?? 0) > 0
  const acceptsFreeform = inputRequest.allowFreeform === true || !hasOptions
  const selectedOption = inputRequest.options?.find(
    (option) => option.id === inputResponse?.optionId
  )
  const responseLabel =
    selectedOption?.label ?? inputResponse?.text ?? inputResponse?.optionId
  const answer = freeform.trim()
  const canSubmit =
    canRespond &&
    !submitting &&
    (selectedOptionId.length > 0 || answer.length > 0)

  const submitResponse = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    const response: AgentInputResponse = {
      requestId: inputRequest.requestId,
      ...(selectedOptionId ? { optionId: selectedOptionId } : {}),
      ...(answer ? { text: answer } : {}),
    }

    void Promise.resolve(onInputResponses([response])).catch(() => {
      setSubmitting(false)
    })
  }

  return (
    <section
      className={`overflow-hidden border ${
        placement === "composer"
          ? "animate-in rounded-xl border-input bg-background fade-in slide-in-from-bottom-1 duration-200"
          : "rounded-lg border-border/80 bg-muted/35"
      }`}
      data-input-request={inputRequest.requestId}
      data-input-request-state={inputResponse ? "responded" : "pending"}
      data-question-placement={placement}
    >
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-background text-foreground">
          <IconMessageQuestion className="size-3" />
        </span>
        <p className="text-[0.62rem] font-medium text-foreground">
          Nest needs one detail
        </p>
        <span className="ml-auto text-[0.54rem] font-medium text-muted-foreground">
          {inputResponse ? "Answered" : "Your input"}
        </span>
      </div>

      <div className="px-3 py-3">
        <p className="text-[0.72rem] leading-relaxed font-medium text-pretty text-foreground">
          {inputRequest.prompt}
        </p>

        {inputResponse ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-md bg-emerald-500/8 px-2.5 py-2 text-emerald-700 dark:text-emerald-400">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-500/12">
              <IconCheck className="size-2.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.55rem] font-medium tracking-wide uppercase opacity-75">
                Answered
              </p>
              <p className="mt-0.5 text-[0.64rem] leading-relaxed text-pretty text-foreground">
                {responseLabel ?? "Response sent"}
              </p>
            </div>
          </div>
        ) : (
          <form className="mt-2.5" onSubmit={submitResponse}>
            {hasOptions ? (
              <div
                className="grid gap-1.5"
                role="radiogroup"
                aria-label={inputRequest.prompt}
              >
                {inputRequest.options?.map((option) => {
                  const selected = selectedOptionId === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!canRespond || submitting}
                      onClick={() => {
                        setSelectedOptionId(option.id)
                        setFreeform("")
                      }}
                      className={`group flex min-h-8 w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-[border-color,background-color,scale] duration-150 ease-out active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 ${
                        selected
                          ? "border-foreground/25 bg-background"
                          : "border-border/75 bg-background/35 hover:border-border hover:bg-background/70"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors ${
                          selected
                            ? "border-foreground bg-foreground"
                            : "border-input bg-background"
                        }`}
                        aria-hidden="true"
                      >
                        <span
                          className={`size-1 rounded-full bg-background transition-transform ${
                            selected ? "scale-100" : "scale-0"
                          }`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.64rem] leading-snug font-medium text-foreground">
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="mt-0.5 block text-[0.56rem] leading-relaxed text-pretty text-muted-foreground">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {acceptsFreeform ? (
              <input
                value={freeform}
                disabled={!canRespond || submitting}
                onChange={(event) => {
                  setFreeform(event.target.value)
                  setSelectedOptionId("")
                }}
                aria-label="Answer"
                placeholder={
                  hasOptions ? "Something else…" : "Type your answer…"
                }
                className={`${hasOptions ? "mt-1.5" : ""} h-8 w-full rounded-md border border-input bg-background/60 px-2.5 text-[0.64rem] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:opacity-50`}
              />
            ) : null}

            <div className="mt-2.5 flex items-center justify-between gap-3">
              <p className="text-[0.54rem] leading-relaxed text-muted-foreground">
                The response will continue after your answer.
              </p>
              <Button
                type="submit"
                size="sm"
                className="shrink-0 rounded-full px-3"
                disabled={!canSubmit}
              >
                {submitting ? "Sending…" : "Answer"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

function MessagePart({
  part,
  isUser = false,
  canRespond,
  onInputResponses,
  onOpenUIAction,
}: {
  part: EveMessagePart
  isUser?: boolean
  canRespond: boolean
  onInputResponses: (
    responses: readonly AgentInputResponse[]
  ) => void | Promise<void>
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

  if (part.type === "dynamic-tool") {
    const inputRequest = part.toolMetadata?.eve?.inputRequest
    if (inputRequest?.kind === "question") {
      const inputResponse = part.toolMetadata?.eve?.inputResponse
      if (!inputResponse) return null

      return (
        <QuestionRequest
          canRespond={canRespond}
          inputRequest={inputRequest}
          inputResponse={inputResponse}
          onInputResponses={onInputResponses}
        />
      )
    }
  }
  return null
}

type MessageRenderItem =
  | {
      key: string
      kind: "activity"
      parts: readonly AgentActivityPart[]
    }
  | {
      index: number
      key: string
      kind: "part"
      part: EveMessagePart
    }

function messageRenderItems(parts: readonly EveMessagePart[]) {
  const items: MessageRenderItem[] = []
  let activityParts: AgentActivityPart[] = []

  const flushActivity = () => {
    if (activityParts.length === 0) return

    const first = activityParts[0]
    const last = activityParts.at(-1)
    items.push({
      key: `activity-${first?.stepIndex ?? 0}-${
        last?.type === "dynamic-tool" ? last.toolCallId : activityParts.length
      }`,
      kind: "activity",
      parts: activityParts,
    })
    activityParts = []
  }

  parts.forEach((part, index) => {
    if (
      (part.type === "reasoning" || part.type === "dynamic-tool") &&
      isAgentActivityPart(part)
    ) {
      activityParts.push(part)
      return
    }

    if (part.type === "step-start") return
    flushActivity()

    const isVisibleQuestion =
      part.type === "dynamic-tool" &&
      part.toolMetadata?.eve?.inputRequest?.kind === "question" &&
      !isPendingQuestionPart(part)

    if (part.type !== "text" && !isVisibleQuestion) return

    items.push({
      index,
      key:
        part.type === "dynamic-tool"
          ? part.toolCallId
          : `${part.type}-${part.stepIndex ?? 0}-${index}`,
      kind: "part",
      part,
    })
  })

  flushActivity()
  return items
}

export function FinanceChatPanel({ onClose }: { onClose: () => void }) {
  const { resolvedTheme } = useTheme()
  const reduceMotion = useReducedMotion()
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
  const workLabel = isBusy
    ? activeWorkLabel(messages, agent.status)
    : "Waiting for next update"
  const workKey = activeTurnKey(messages, agent.status)
  const activeAssistantId = activeAssistantMessageId(messages, isBusy)
  const pendingQuestionPart = messages
    .flatMap((message) => message.parts)
    .find(
      (part): part is EveDynamicToolPart =>
        part.type === "dynamic-tool" && isPendingQuestionPart(part)
    )
  const pendingQuestionRequest =
    pendingQuestionPart?.toolMetadata?.eve?.inputRequest
  const send = agent.send
  const respond = agent.respond

  React.useEffect(() => {
    const conversation = conversationRef.current
    if (conversation) conversation.scrollTop = conversation.scrollHeight
  }, [messages, agent.status])

  const sendMessage = React.useCallback(
    (value: string, clientContext?: SendTurnOptions["clientContext"]) => {
      const message = value.trim()
      if (!message) return

      setDraft("")
      void send(message, {
        ...(isBusy ? { turnPolicy: "steer" as const } : {}),
        ...(clientContext ? { clientContext } : {}),
      }).catch(() => {})
    },
    [isBusy, send]
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

  const handleInputResponses = React.useCallback(
    (responses: readonly AgentInputResponse[]) => respond(responses),
    [respond]
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
            <motion.div
              data-chat-aurora=""
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: -28,
                    }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                duration: 0.7,
                bounce: 0,
              }}
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
            </motion.div>

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
          <div className="flex min-h-full flex-col gap-5 px-3.5 py-4">
            {messages.map((message) => {
              const renderItems = messageRenderItems(message.parts)

              if (renderItems.length === 0) return null

              return (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-8 max-w-[88%] self-end rounded-lg bg-foreground px-3.5 py-2.5 text-background"
                      : "w-full space-y-4 self-start pr-2"
                  }
                >
                  {renderItems.map((item) =>
                    item.kind === "activity" ? (
                      <AgentActivityTrace
                        key={item.key}
                        parts={item.parts}
                        turnActive={message.id === activeAssistantId}
                      />
                    ) : (
                      <MessagePart
                        key={item.key}
                        part={item.part}
                        isUser={message.role === "user"}
                        canRespond={agent.status === "ready"}
                        onInputResponses={handleInputResponses}
                        onOpenUIAction={handleOpenUIAction}
                      />
                    )
                  )}
                </div>
              )
            })}

            <AnimatePresence initial={false}>
              {isBusy ? (
                <motion.div
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  className="self-start"
                  exit={{
                    opacity: 0,
                    y: -4,
                    filter: "blur(4px)",
                    transition: { duration: 0.15, ease: "easeIn" },
                  }}
                  initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                  key={workKey}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                >
                  <AgentLoadingState label={workLabel} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 pt-0">
        {agent.error ? (
          <p className="mb-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-[0.62rem] text-destructive">
            {agent.error.message}
          </p>
        ) : null}

        {pendingQuestionPart && pendingQuestionRequest?.kind === "question" ? (
          <QuestionRequest
            key={pendingQuestionPart.toolCallId}
            canRespond={agent.status === "ready"}
            inputRequest={pendingQuestionRequest}
            onInputResponses={handleInputResponses}
            placement="composer"
          />
        ) : (
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
        )}
      </div>
    </aside>
  )
}

"use client"

import * as React from "react"
import {
  Renderer,
  type ActionEvent,
  type OpenUIError,
} from "@openuidev/react-lang"
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib"

const OPENUI_FENCE = /^```(?:openui(?:-lang)?|ui)?[\t ]*\n?/i

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
  const [errors, setErrors] = React.useState<OpenUIError[]>([])
  const program = extractOpenUIProgram(content, isStreaming)

  if (!program) return null

  return (
    <div
      className="nest-openui min-w-0 overflow-hidden px-3"
      data-openui-message
    >
      <Renderer
        library={openuiChatLibrary}
        response={program}
        isStreaming={isStreaming}
        onAction={onAction}
        onError={setErrors}
        publishObservability={false}
      />
      {!isStreaming && errors.length > 0 ? (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-[0.62rem] leading-relaxed text-pretty text-destructive">
          This interactive response could not be fully rendered. Ask Nest to
          retry it.
        </p>
      ) : null}
    </div>
  )
}

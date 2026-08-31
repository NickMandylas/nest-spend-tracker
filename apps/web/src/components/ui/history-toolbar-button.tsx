"use client"

import * as React from "react"
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react"
import { useEditorRef, useEditorSelector } from "platejs/react"

import { ToolbarButton } from "@/components/ui/toolbar"

export function RedoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const editor = useEditorRef()
  const disabled = useEditorSelector(
    (editor) => editor.history.redos.length === 0,
    []
  )

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.redo()}
      onMouseDown={(event) => event.preventDefault()}
      tooltip="Redo (⌘⇧Z)"
    >
      <IconArrowForwardUp />
    </ToolbarButton>
  )
}

export function UndoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const editor = useEditorRef()
  const disabled = useEditorSelector(
    (editor) => editor.history.undos.length === 0,
    []
  )

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.undo()}
      onMouseDown={(event) => event.preventDefault()}
      tooltip="Undo (⌘Z)"
    >
      <IconArrowBackUp />
    </ToolbarButton>
  )
}

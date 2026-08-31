"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconBold,
  IconCode,
  IconDeviceFloppy,
  IconItalic,
  IconStrikethrough,
} from "@tabler/icons-react"
import { MarkdownPlugin } from "@platejs/markdown"
import { Plate, useEditorSelector, usePlateEditor } from "platejs/react"

import { saveTransactionNote } from "@/app/actions/transactions"
import { BasicNodesKit } from "@/components/editor/plugins/basic-nodes-kit"
import { Button } from "@/components/ui/button"
import { Editor, EditorContainer } from "@/components/ui/editor"
import { FixedToolbar } from "@/components/ui/fixed-toolbar"
import {
  RedoToolbarButton,
  UndoToolbarButton,
} from "@/components/ui/history-toolbar-button"
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button"
import { ToolbarSeparator } from "@/components/ui/toolbar"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { Transaction } from "@/lib/redbark-types"

const NOTE_PLUGINS = [...BasicNodesKit, MarkdownPlugin]

function createEmptyValue() {
  return [{ type: "p" as const, children: [{ text: "" }] }]
}

function normalizeMarkdown(markdown: string) {
  const trimmedMarkdown = markdown.trim()

  return /^[\u200B-\u200D\uFEFF]*$/.test(trimmedMarkdown) ? "" : trimmedMarkdown
}

function TransactionNoteEditorBody({
  transaction,
  savedMarkdown,
  onSavedMarkdownChange,
  onTransactionChange,
}: {
  transaction: Transaction
  savedMarkdown: string
  onSavedMarkdownChange: (markdown: string) => void
  onTransactionChange: (transaction: Transaction) => void
}) {
  const router = useRouter()
  const draftMarkdown = useEditorSelector(
    (currentEditor) =>
      normalizeMarkdown(
        currentEditor
          .getApi(MarkdownPlugin)
          .markdown.serialize({ value: currentEditor.children })
      ),
    []
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, startSaving] = React.useTransition()
  const isDirty = draftMarkdown !== savedMarkdown

  function saveNote() {
    if (isSaving || !isDirty) return

    setError(null)
    startSaving(async () => {
      const result = await saveTransactionNote(transaction.id, draftMarkdown)
      if (!result.ok) {
        setError(result.message)
        return
      }

      const nextMarkdown = normalizeMarkdown(
        result.transaction.note_markdown ?? ""
      )
      onSavedMarkdownChange(nextMarkdown)
      onTransactionChange(result.transaction)
      router.refresh()
    })
  }

  return (
    <>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-border bg-background transition-[border-color,box-shadow] focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/10">
        <FixedToolbar className="static z-0 justify-start rounded-none border-b border-border bg-muted/40 p-1 backdrop-blur-none">
          <UndoToolbarButton aria-label="Undo" className="size-7 min-w-7" />
          <RedoToolbarButton aria-label="Redo" className="size-7 min-w-7" />
          <ToolbarSeparator className="mx-1.5 h-4" />
          <MarkToolbarButton
            nodeType="bold"
            tooltip="Bold (⌘B)"
            aria-label="Bold"
            className="size-7 min-w-7"
          >
            <IconBold className="size-3.5" />
          </MarkToolbarButton>
          <MarkToolbarButton
            nodeType="italic"
            tooltip="Italic (⌘I)"
            aria-label="Italic"
            className="size-7 min-w-7"
          >
            <IconItalic className="size-3.5" />
          </MarkToolbarButton>
          <MarkToolbarButton
            nodeType="strikethrough"
            tooltip="Strikethrough (⌘⇧X)"
            aria-label="Strikethrough"
            className="size-7 min-w-7"
          >
            <IconStrikethrough className="size-3.5" />
          </MarkToolbarButton>
          <MarkToolbarButton
            nodeType="code"
            tooltip="Inline code (⌘E)"
            aria-label="Inline code"
            className="size-7 min-w-7"
          >
            <IconCode className="size-3.5" />
          </MarkToolbarButton>
        </FixedToolbar>
        <EditorContainer className="max-h-52 min-h-24 cursor-text">
          <Editor
            variant="none"
            placeholder="Add context, reminders, or split details…"
            aria-label="Transaction note"
            className="min-h-24 px-3 py-2.5 text-xs leading-relaxed [&_blockquote]:pl-3 [&_h1]:mt-1 [&_h1]:text-lg [&_h2]:mt-1 [&_h2]:text-base [&_h3]:mt-1 [&_h3]:text-sm"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                saveNote()
              }
            }}
          />
        </EditorContainer>
      </div>

      {error && (
        <p className="mt-2 text-[0.62rem] text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p
          className={`text-[0.56rem] ${
            isDirty
              ? "font-medium text-amber-700 dark:text-amber-300"
              : "text-muted-foreground"
          }`}
          aria-live="polite"
        >
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <Button
          type="button"
          size="sm"
          className="h-7 rounded-md px-2.5 text-[0.62rem]"
          onClick={saveNote}
          disabled={isSaving || !isDirty}
        >
          <IconDeviceFloppy className="size-3.5" />
          {isSaving ? "Saving…" : "Save updates"}
        </Button>
      </div>
    </>
  )
}

export function TransactionNoteEditor({
  transaction,
  onTransactionChange,
}: {
  transaction: Transaction
  onTransactionChange: (transaction: Transaction) => void
}) {
  const initialMarkdown = normalizeMarkdown(transaction.note_markdown ?? "")
  const [savedMarkdown, setSavedMarkdown] = React.useState(initialMarkdown)
  const editor = usePlateEditor(
    {
      plugins: NOTE_PLUGINS,
      value: (currentEditor) =>
        savedMarkdown
          ? currentEditor
              .getApi(MarkdownPlugin)
              .markdown.deserialize(savedMarkdown)
          : createEmptyValue(),
    },
    [transaction.id]
  )

  return (
    <section aria-labelledby="transaction-notes-heading">
      <p
        id="transaction-notes-heading"
        className="text-[0.6rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
      >
        Notes
      </p>

      <TooltipProvider delayDuration={250}>
        <Plate editor={editor}>
          <TransactionNoteEditorBody
            transaction={transaction}
            savedMarkdown={savedMarkdown}
            onSavedMarkdownChange={setSavedMarkdown}
            onTransactionChange={onTransactionChange}
          />
        </Plate>
      </TooltipProvider>
    </section>
  )
}

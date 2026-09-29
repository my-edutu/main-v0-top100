'use client'

import { useCallback, useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading2, Italic, Link2, List, Quote } from 'lucide-react'
import { Markdown } from 'tiptap-markdown'

type MediumPostEditorProps = {
  value: string
  onChange: (value: string) => void
}

function FormatButton({
  label,
  active = false,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange-700 disabled:cursor-default disabled:opacity-50 ${
        active ? 'bg-orange-50 text-orange-800' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'
      }`}
    >
      {children}
    </button>
  )
}

export function MediumPostEditor({ value, onChange }: MediumPostEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Link.configure({ autolink: true, openOnClick: false }),
        Placeholder.configure({ placeholder: 'Tell your story…' }),
        Markdown.configure({ html: false, breaks: true, transformPastedText: true }),
      ],
      content: value || '',
      editorProps: {
        attributes: {
          class: 'member-post-prose min-h-[300px] px-5 py-5 text-[18px] leading-8 outline-none sm:min-h-[360px] sm:px-8 sm:py-7',
          'aria-label': 'Write your post',
          role: 'textbox',
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        onChangeRef.current(updatedEditor.storage.markdown.getMarkdown())
      },
    },
    [],
  )

  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    if (value !== current) editor.commands.setContent(value || '', false)
  }, [editor, value])

  const toggleLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Add a link', previousUrl ?? 'https://')
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }, [editor])

  const disabled = !editor

  return (
    <section className="member-post-editor overflow-hidden rounded-xl border border-neutral-200 bg-white" aria-label="Post writing area">
      <div className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-neutral-200 px-3 py-1.5" role="toolbar" aria-label="Formatting options">
        <FormatButton label="Bold" disabled={disabled} active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="size-[18px]" aria-hidden="true" />
        </FormatButton>
        <FormatButton label="Italic" disabled={disabled} active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="size-[18px]" aria-hidden="true" />
        </FormatButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-neutral-200" aria-hidden="true" />
        <FormatButton label="Heading" disabled={disabled} active={editor?.isActive('heading')} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="size-[18px]" aria-hidden="true" />
        </FormatButton>
        <FormatButton label="Quote" disabled={disabled} active={editor?.isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <Quote className="size-[18px]" aria-hidden="true" />
        </FormatButton>
        <FormatButton label="Bulleted list" disabled={disabled} active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="size-[18px]" aria-hidden="true" />
        </FormatButton>
        <FormatButton label="Add link" disabled={disabled} active={editor?.isActive('link')} onClick={toggleLink}>
          <Link2 className="size-[18px]" aria-hidden="true" />
        </FormatButton>
      </div>
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div aria-hidden="true" className="min-h-[300px] px-5 py-5 font-serif text-lg leading-8 text-neutral-400 sm:min-h-[360px] sm:px-8 sm:py-7">
          Tell your story…
        </div>
      )}
    </section>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BubbleMenu, EditorContent, FloatingMenu, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading1, Heading2, Heading3, Italic, LinkIcon, List, ListOrdered, Quote, Code, ImageIcon, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type MediumRichEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}


const formatButton = (props: { icon: React.ReactNode; isActive?: boolean; onClick: () => void; label: string }) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={props.onClick}
    aria-label={props.label}
    className={cn(
      'inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700/30 bg-zinc-900/60 text-zinc-300 transition hover:bg-zinc-800/80',
      props.isActive ? 'bg-primary/20 text-primary border-primary/40' : '',
    )}
  >
    {props.icon}
  </button>
)

export function MediumRichEditor({ value, onChange, placeholder }: MediumRichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setUploading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline decoration-primary/30 hover:decoration-primary',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl my-6 shadow-lg max-h-[480px] object-cover w-full',
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Press enter to continue writing…'
          }
          return placeholder ?? 'Tell an inspiring story...'
        },
        includeChildren: true,
      }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none text-lg leading-relaxed selection:bg-primary/30 selection:text-white',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value && value !== current) {
      editor.commands.setContent(value, false)
    }
  }, [editor, value])

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return
      try {
        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        })

        const payload = await response.json()
        if (!response.ok || !payload?.url) {
          throw new Error(payload?.error ?? 'Upload failed')
        }

        editor.chain().focus().setImage({ src: payload.url }).run()
      } catch (error) {
        console.error('[editor] image upload failed', error)
      } finally {
        setUploading(false)
      }
    },
    [editor],
  )

  const promptForLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const floatingMenuItems = useMemo(
    () => [
      {
        icon: <Heading1 className="h-4 w-4" />,
        label: 'Heading 1',
        action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: editor?.isActive('heading', { level: 1 }),
      },
      {
        icon: <Heading2 className="h-4 w-4" />,
        label: 'Heading 2',
        action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: editor?.isActive('heading', { level: 2 }),
      },
      {
        icon: <Quote className="h-4 w-4" />,
        label: 'Quote',
        action: () => editor?.chain().focus().toggleBlockquote().run(),
        isActive: editor?.isActive('blockquote'),
      },
      {
        icon: <Minus className="h-4 w-4" />,
        label: 'Divider',
        action: () => editor?.chain().focus().setHorizontalRule().run(),
        isActive: false,
      },
    ],
    [editor],
  )

  if (!editor) {
    return (
      <div className="w-full rounded-2xl border border-zinc-800/60 bg-black/40 px-6 py-10 text-center text-zinc-500">
        Loading editor...
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-2xl border border-zinc-800/60 bg-black/40 backdrop-blur">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800/60 bg-black/60 px-4 py-3 backdrop-blur-sm">
        {formatButton({
          icon: <Bold className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleBold().run(),
          isActive: editor.isActive('bold'),
          label: 'Bold',
        })}
        {formatButton({
          icon: <Italic className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleItalic().run(),
          isActive: editor.isActive('italic'),
          label: 'Italic',
        })}
        {formatButton({
          icon: <Underline className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleUnderline().run(),
          isActive: editor.isActive('underline'),
          label: 'Underline',
        })}
        <span className="mx-1 h-6 w-[1px] bg-zinc-800" />
        {formatButton({
          icon: <Heading1 className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          isActive: editor.isActive('heading', { level: 1 }),
          label: 'Heading 1',
        })}
        {formatButton({
          icon: <Heading2 className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          isActive: editor.isActive('heading', { level: 2 }),
          label: 'Heading 2',
        })}
        {formatButton({
          icon: <Heading3 className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          isActive: editor.isActive('heading', { level: 3 }),
          label: 'Heading 3',
        })}
        <span className="mx-1 h-6 w-[1px] bg-zinc-800" />
        {formatButton({
          icon: <List className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleBulletList().run(),
          isActive: editor.isActive('bulletList'),
          label: 'Bullet list',
        })}
        {formatButton({
          icon: <ListOrdered className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
          isActive: editor.isActive('orderedList'),
          label: 'Ordered list',
        })}
        {formatButton({
          icon: <Quote className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
          isActive: editor.isActive('blockquote'),
          label: 'Quote',
        })}
        {formatButton({
          icon: <Code className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleCodeBlock().run(),
          isActive: editor.isActive('codeBlock'),
          label: 'Code block',
        })}
        <span className="mx-1 h-6 w-[1px] bg-zinc-800" />
        {formatButton({
          icon: <LinkIcon className="h-4 w-4" />,
          onClick: promptForLink,
          isActive: editor.isActive('link'),
          label: 'Add link',
        })}
        {formatButton({
          icon: <ImageIcon className="h-4 w-4" />,
          onClick: () => fileInputRef.current?.click(),
          label: 'Insert image',
        })}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const [file] = event.target.files ?? []
            if (file) {
              await insertImage(file)
              event.target.value = ''
            }
          }}
        />
        {isUploading && (
          <span className="text-xs text-zinc-400">
            Uploading image...
          </span>
        )}
      </div>

      <div className="relative">
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 120, animation: 'shift-away', placement: 'top' }}
          className="flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/95 px-3 py-2 shadow-xl"
        >
          {formatButton({
            icon: <Bold className="h-4 w-4" />,
            onClick: () => editor.chain().focus().toggleBold().run(),
            isActive: editor.isActive('bold'),
            label: 'Bold',
          })}
          {formatButton({
            icon: <Italic className="h-4 w-4" />,
            onClick: () => editor.chain().focus().toggleItalic().run(),
            isActive: editor.isActive('italic'),
            label: 'Italic',
          })}
          {formatButton({
            icon: <Underline className="h-4 w-4" />,
            onClick: () => editor.chain().focus().toggleUnderline().run(),
            isActive: editor.isActive('underline'),
            label: 'Underline',
          })}
          {formatButton({
            icon: <Quote className="h-4 w-4" />,
            onClick: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: editor.isActive('blockquote'),
            label: 'Quote',
          })}
        </BubbleMenu>

        <FloatingMenu editor={editor} className="flex flex-col rounded-lg border border-zinc-800 bg-black/80 p-2 shadow-lg">
          {floatingMenuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80',
                item.isActive ? 'bg-primary/10 text-primary' : '',
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={item.action}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </FloatingMenu>

        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  )
}


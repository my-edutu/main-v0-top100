'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BubbleMenu, EditorContent, FloatingMenu, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import UnderlineExtension from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading1, Heading2, Heading3, Italic, Underline, LinkIcon, List, ListOrdered, Quote, Code, ImageIcon, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type LightRichEditorProps = {
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
            'inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50',
            props.isActive ? 'bg-orange-50 text-orange-600 border-orange-200' : '',
        )}
    >
        {props.icon}
    </button>
)

export function LightRichEditor({ value, onChange, placeholder }: LightRichEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setUploading] = useState(false)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true, keepAttributes: false },
                orderedList: { keepMarks: true, keepAttributes: false },
            }),
            UnderlineExtension,
            Link.configure({
                autolink: true,
                openOnClick: true,
                HTMLAttributes: {
                    class: 'text-orange-600 underline decoration-orange-200 hover:decoration-orange-600',
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
                    'prose prose-zinc max-w-none focus:outline-none text-lg leading-relaxed selection:bg-orange-100 selection:text-orange-900 min-h-[150px] px-4 py-4',
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
            <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-400">
                Loading editor...
            </div>
        )
    }

    return (
        <div className="relative w-full rounded-2xl border border-zinc-200 bg-white">
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-100 bg-white/80 px-4 py-3 backdrop-blur-sm rounded-t-2xl">
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
                <span className="mx-1 h-6 w-[1px] bg-zinc-200" />
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
                <span className="mx-1 h-6 w-[1px] bg-zinc-200" />
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
                <span className="mx-1 h-6 w-[1px] bg-zinc-200" />
                {formatButton({
                    icon: <LinkIcon className="h-4 w-4" />,
                    onClick: promptForLink,
                    isActive: editor.isActive('link'),
                    label: 'Add link',
                })}
                {/* Simplified image upload for now - relies on same endpoint */}
            </div>

            <div className="relative">
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 120, animation: 'shift-away', placement: 'top' }}
                    className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 shadow-xl"
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
                        icon: <LinkIcon className="h-4 w-4" />,
                        onClick: promptForLink,
                        isActive: editor.isActive('link'),
                        label: 'Link',
                    })}
                </BubbleMenu>

                <EditorContent editor={editor} className="tiptap-editor" />
            </div>
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { hasSoftwareKeyboard } from '@/lib/dashboard/mobile-keyboard'

export function useMobileKeyboard() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const element = document.activeElement
        const editing = element instanceof HTMLElement && (
          element.isContentEditable || element.tagName === 'TEXTAREA' ||
          (element instanceof HTMLInputElement && !['button', 'submit', 'checkbox', 'radio', 'file', 'range', 'color'].includes(element.type))
        )
        setOpen(hasSoftwareKeyboard(window.innerHeight, viewport.height, viewport.scale, editing))
      })
    }
    viewport.addEventListener('resize', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])
  return open
}

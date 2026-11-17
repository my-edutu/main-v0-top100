'use client'

import { useEffect } from 'react'

/** Protect full-page exits and same-tab links. Browser history navigation still
 * needs an app-router-level integration test; this hook does not claim to trap it. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const guardLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
      const destination = new URL(anchor.href, window.location.href)
      const current = new URL(window.location.href)
      if (destination.origin === current.origin && destination.pathname === current.pathname && destination.search === current.search) return
      if (!window.confirm('You have unsaved changes. Leave this page without saving them?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('click', guardLink, true)
    return () => {
      window.removeEventListener('beforeunload', warn)
      document.removeEventListener('click', guardLink, true)
    }
  }, [dirty])
}

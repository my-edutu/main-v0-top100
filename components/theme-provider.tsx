'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, scriptProps, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        ...scriptProps,
        // Keep the initial server bootstrap executable. Client-created scripts
        // cannot execute in React; next-themes applies changes through its effects.
        type: typeof window === 'undefined' ? scriptProps?.type : 'application/json',
      }}
    >
      {children}
    </NextThemesProvider>
  )
}

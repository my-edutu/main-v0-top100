"use client"

import { useSyncExternalStore } from "react"

const motionQuery = "(prefers-reduced-motion: reduce)"

function subscribeToMotion(onChange: () => void) {
  const preference = window.matchMedia(motionQuery)
  preference.addEventListener("change", onChange)
  return () => preference.removeEventListener("change", onChange)
}

function prefersReducedMotion() {
  return window.matchMedia(motionQuery).matches
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, prefersReducedMotion, () => true)
}

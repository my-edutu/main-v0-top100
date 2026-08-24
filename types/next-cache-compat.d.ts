// Next.js 16 made the cache-life profile argument mandatory in the TypeScript
// signature for revalidateTag(). The runtime still supports the historical
// one-argument form during the documented migration window. Keep that overload
// visible while the existing mutation routes are moved to explicit cache-life
// profiles in a dedicated cache-semantics change.
import 'next/cache'

declare module 'next/cache' {
  export function revalidateTag(tag: string): void
}

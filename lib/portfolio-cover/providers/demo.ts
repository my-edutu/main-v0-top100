import sharp from 'sharp'

import type { PortfolioImageEditor } from './types'

/** Development-only visual harness. It deliberately does not call a provider. */
export function createDemoImageEditor(): PortfolioImageEditor {
  return {
    async edit({ portrait, variant }) {
      const tint = variant === 'executive-charcoal' ? '#2A2D32' : '#E8DCC4'
      const overlay = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: `${tint}55` } }).png().toBuffer()
      const image = await sharp(portrait).composite([{ input: overlay, blend: 'soft-light' }]).png().toBuffer()
      return { image }
    },
  }
}

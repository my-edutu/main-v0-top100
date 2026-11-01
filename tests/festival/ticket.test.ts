import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { buildFestivalTicketEmail, renderFestivalTicket } from '@/lib/festival/ticket'

const ticket = {
  id: 'e078c178-077d-43c4-9f31-1140beab9cc3',
  fullName: 'Amara <Okafor> & Co',
  pickupRequested: true,
}

describe('personal festival ticket', () => {
  it('emails the correct admission details and escapes the member name', () => {
    const email = buildFestivalTicketEmail(ticket)
    expect(email.html).toContain('Amara &lt;Okafor&gt; &amp; Co')
    expect(email.text).toContain('30 November 2026')
    expect(email.text).toContain('University of Lagos')
    expect(email.text).toContain(ticket.id)
    expect(email.text).toContain('award and certificate')
    expect(email.text).toContain('Time to be confirmed')
    expect(email.html).toContain('https://top100afl.com/dashboard/festival')
    expect(email.text).not.toContain('dispatched already')
  })
  it('provides dispatch guidance when festival collection is declined', () => {
    expect(buildFestivalTicketEmail({ ...ticket, pickupRequested: false }).text).toContain('dispatched')
  })
  it('renders a downloadable PNG, retaining a long name without clipping or interpreting markup', async () => {
    const image = await renderFestivalTicket({ ...ticket, fullName: 'Éléonore Nwosu <Leader> '.repeat(6) })
    const metadata = await sharp(image).metadata()
    expect(metadata).toMatchObject({ format: 'png', width: 1080, height: 1440 })
    const raw = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    // The name band must contain actual visible glyphs, not blank/invisible text.
    let dark = 0
    for (let y = 670; y < 800; y++) for (let x = 64; x < 1016; x++) {
      const i = (y * raw.info.width + x) * raw.info.channels
      if (raw.data[i] < 90 && raw.data[i + 1] < 90 && raw.data[i + 2] < 90) dark++
    }
    expect(dark).toBeGreaterThan(1000)
  }, 30000)
})

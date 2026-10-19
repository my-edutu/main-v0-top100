/* eslint-disable @next/next/no-img-element -- ImageResponse uses plain img elements for Satori. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const socialImageSize = { width: 1200, height: 630 }

export async function createSocialShareImage() {
  const [brandFile, awardFile] = await Promise.all([
    readFile(join(process.cwd(), 'public', 'afl-2026-brand-mark.png')),
    readFile(join(process.cwd(), 'public', 'afl-physical-award-2026.png')),
  ])
  const brandMark = `data:image/png;base64,${brandFile.toString('base64')}`
  const award = `data:image/png;base64,${awardFile.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '52px 60px',
          background: '#fffaf0',
          color: '#171412',
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'absolute', right: -95, top: -210, width: 620, height: 620, borderRadius: 310, background: '#ffe08a' }} />
        <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: 12, height: '100%', background: '#f97316' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 650 }}>
          <div style={{ display: 'flex', alignItems: 'center', width: 390, height: 110, overflow: 'hidden', borderRadius: 14 }}>
            <img src={brandMark} alt="" style={{ width: 390, height: 110, objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
            <div style={{ display: 'flex', color: '#9a4a00', fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
              Africa Future Leaders
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14, fontSize: 58, lineHeight: 1.06, fontWeight: 700, letterSpacing: -2 }}>
              <span>Impact Beyond</span>
              <span>Recognition</span>
            </div>
            <div style={{ display: 'flex', maxWidth: 570, marginTop: 18, color: '#51483d', fontSize: 23, lineHeight: 1.4 }}>
              A community of African leaders turning potential into lasting impact.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b4c22', fontSize: 19, fontWeight: 600 }}>
            <span style={{ display: 'flex', width: 30, height: 4, background: '#f97316' }} />
            top100afl.com
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 28, top: 75, width: 500, height: 480, padding: 24, borderRadius: 28, background: '#ffffff', boxShadow: '0 22px 55px rgba(103, 65, 0, .14)' }}>
          <img src={award} alt="" style={{ width: 450, height: 430, objectFit: 'contain' }} />
        </div>
      </div>
    ),
    { ...socialImageSize },
  )
}

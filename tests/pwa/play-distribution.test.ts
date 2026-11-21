import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { androidPlayLaunchResponse, isAndroidPlaySession, PLAY_DISTRIBUTION_COOKIE } from '@/lib/play-distribution'

describe('Google Play Android distribution', () => {
  it('preserves an app link and sets the restriction before the login redirect', () => {
    const response = androidPlayLaunchResponse(new NextRequest(
      'https://www.top100afl.com/dashboard/letters/recommendation?source=shortcut&distribution=google-play',
    ))

    expect(response?.headers.get('location')).toBe('https://www.top100afl.com/dashboard/letters/recommendation?source=shortcut')
    expect(response?.cookies.get(PLAY_DISTRIBUTION_COOKIE)).toMatchObject({
      value: '1', path: '/', httpOnly: true, sameSite: 'lax', secure: true,
    })
    expect(response?.headers.get('cache-control')).toBe('private, no-store')
    expect(isAndroidPlaySession(response!.cookies)).toBe(true)
  })

  it('recognises the Android package referrer and does not redirect twice', () => {
    const headers = { referer: 'android-app://com.top100afl.app/' }
    const url = 'https://www.top100afl.com/dashboard'
    expect(androidPlayLaunchResponse(new NextRequest(url, { headers }))?.cookies.has(PLAY_DISTRIBUTION_COOKIE)).toBe(true)
    expect(androidPlayLaunchResponse(new NextRequest(url, {
      headers: { ...headers, cookie: PLAY_DISTRIBUTION_COOKIE + '=1' },
    }))).toBeNull()
  })

  it('leaves normal web visits, other Android apps and API mutations alone', () => {
    const url = 'https://www.top100afl.com/dashboard'
    expect(androidPlayLaunchResponse(new NextRequest(url))).toBeNull()
    expect(androidPlayLaunchResponse(new NextRequest(url, {
      headers: { referer: 'android-app://com.top100afl.app.fake/' },
    }))).toBeNull()
    expect(androidPlayLaunchResponse(new NextRequest(url + '?distribution=google-play', { method: 'POST' }))).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'

import { GET } from '@/app/api/programmes/cities/route'

function search(country: string, q: string) {
  return GET(new Request('http://localhost/api/programmes/cities?' + new URLSearchParams({ country, q })))
}

describe('programme city lookup', () => {
  it('finds cities by state or region within the selected country', async () => {
    expect(await search('NG', 'Rivers').json()).toMatchObject({
      cities: expect.arrayContaining([{ name: 'Port Harcourt', region: 'Rivers State' }]),
    })
    expect(await search('GH', 'Port Harcourt').json()).toEqual({ cities: [] })
  })

  it('lists Nigerian states and limits city results to the selected state', async () => {
    const base = 'http://localhost/api/programmes/cities?country=NG'
    const { regions } = await GET(new Request(base + '&scope=regions')).json()
    expect(regions).toContain('Rivers State')
    expect(regions).not.toContain('Greater Accra Region')

    const { cities } = await GET(new Request(base + '&region=Rivers%20State')).json()
    expect(cities).toContainEqual({ name: 'Port Harcourt', region: 'Rivers State' })
    expect(cities.every((city: { region: string }) => city.region === 'Rivers State')).toBe(true)
    expect(await GET(new Request(base + '&region=Rivers%20State&q=Lagos')).json()).toEqual({ cities: [] })
  })

  it('accepts unaccented searches and prefers exact city names', async () => {
    const { cities } = await search('BR', 'sao paulo').json()
    expect(cities[0].name).toBe('São Paulo')
    expect(cities.length).toBeLessThanOrEqual(50)
  })
})

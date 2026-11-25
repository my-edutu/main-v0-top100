import cities from 'cities.json'
import regions from 'cities.json/admin1'

function searchKey(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

const regionNames = new Map(regions.map(({ code, name }) => [code, name]))
const alphabetical = new Intl.Collator('en', { sensitivity: 'base' }).compare
type City = { name: string; region: string; cityKey: string; regionKey: string }
const byCountry = new Map<string, Map<string, City>>()

for (const { country, name, admin1 } of cities) {
  const region = regionNames.get(`${country}.${admin1}`) ?? ''
  const places = byCountry.get(country) ?? new Map<string, City>()
  places.set(`${name},${region}`, { name, region, cityKey: searchKey(name), regionKey: searchKey(region) })
  byCountry.set(country, places)
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') ?? ''
  const region = (searchParams.get('region') ?? '').trim()
  const query = (searchParams.get('q') ?? '').trim()

  if (!/^[A-Z]{2}$/.test(country) || query.length > 150 || region.length > 150) {
    return Response.json({ message: 'Select a country and enter a valid city search.' }, { status: 400 })
  }

  if (searchParams.get('scope') === 'regions') {
    const names = regions.filter(({ code }) => code.startsWith(country + '.')).map(({ name }) => name)
    return Response.json({ regions: [...new Set(names)].sort(alphabetical) })
  }

  const term = searchKey(query)
  const places = byCountry.get(country)?.values() ?? []
  const exact: City[] = []
  const prefixes: City[] = []
  const other: City[] = []
  for (const place of places) {
    if (region && place.region !== region) continue
    if (place.cityKey === term) exact.push(place)
    else if (place.cityKey.startsWith(term)) prefixes.push(place)
    else if (place.cityKey.includes(term) || place.regionKey.includes(term)) other.push(place)
  }

  const byName = (a: City, b: City) => alphabetical(a.name, b.name) || alphabetical(a.region, b.region)
  const matches = [...exact.sort(byName), ...prefixes.sort(byName), ...other.sort(byName)]
  return Response.json({ cities: matches.slice(0, 50).map(({ name, region }) => ({ name, region })) })
}

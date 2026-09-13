import { getAllStates, getLGAsByState } from 'ng-geo-data'

export const nigeriaStates = getAllStates().slice().sort((a, b) => a.name.localeCompare(b.name))
export function isNigeria(country: string) {
  return ['ng', 'nigeria'].includes(country.trim().toLowerCase())
}
export function nigeriaState(value: string) {
  const name = value.trim().toLowerCase().replace(/ state$/, '')
  return nigeriaStates.find(state => state.name.toLowerCase() === name || state.code.toLowerCase() === name || (state.code === 'FC' && ['abuja', 'fct', 'fct abuja', 'federal capital territory'].includes(name)))
}
export function locationSuggestions(stateName: string) {
  const state = nigeriaState(stateName)
  return state ? [...new Set([state.capital, ...getLGAsByState(state.code).map(lga => lga.name)])].sort() : []
}

export const AFRICAN_APPLICANT_COUNTRIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
  'Central African Republic', 'Chad', 'Comoros', "Côte d'Ivoire",
  'Democratic Republic of the Congo', 'Egypt', 'Eswatini', 'Ethiopia', 'Gabon',
  'Gambia', 'Ghana', 'Guinea', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
  'Malawi', 'Mali', 'Mauritania', 'Morocco', 'Mozambique', 'Namibia', 'Niger',
  'Nigeria', 'Republic of the Congo', 'Rwanda', 'Senegal', 'Sierra Leone', 'Somalia',
  'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
  'Zambia', 'Zimbabwe',
]

export const OTHER_APPLICANT_COUNTRIES = [
  'Belgium', 'Canada', 'China', 'Finland', 'France', 'Germany', 'India', 'Ireland',
  'Malaysia', 'Northern Cyprus', 'Russia', 'Turkey', 'United Arab Emirates',
  'United Kingdom', 'United States',
]

export const TOP_APPLICANT_COUNTRIES = [
  { name: 'Nigeria', count: 1045 },
  { name: 'Ethiopia', count: 83 },
  { name: 'Cameroon', count: 56 },
  { name: 'Kenya', count: 53 },
  { name: 'Ghana', count: 47 },
] as const

export const ALL_APPLICANT_COUNTRIES = [
  ...AFRICAN_APPLICANT_COUNTRIES,
  ...OTHER_APPLICANT_COUNTRIES,
]

export type MagazineEdition = {
  year: number
  title: string
  subtitle: string
  cover: string
  downloadLink: string
  readHref: string
  isLatest: boolean
  description: string
}

export const magazineEditions: MagazineEdition[] = [
  {
    year: 2025,
    title: 'Africa Future Leaders Magazine 2025',
    subtitle: 'The New Generation of Changemakers',
    cover: '/magazine-cover-2025.jpg',
    downloadLink: 'https://drive.google.com/file/d/1oolBjSOMgFOnyFlDv24cID-VD33BBWru/view?usp=sharing',
    readHref: '/magazine',
    isLatest: true,
    description: 'Stories from the 2025 Top100 Africa Future Leaders cohort.',
  },
  {
    year: 2024,
    title: 'Africa Future Leaders Magazine 2024',
    subtitle: 'Celebrating Excellence & Innovation',
    cover: '/top100 magazine.webp',
    downloadLink: 'https://drive.google.com/file/d/1WDdJnROclQ57fUm_g6Eeu0enKC_DJELS/view',
    readHref: '/magazine/africa future leaders magazine 2024',
    isLatest: false,
    description: 'Profiles and achievements from the 2024 awardee cohort.',
  },
]

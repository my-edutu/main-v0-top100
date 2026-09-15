export type PortfolioGenerationProgress = {
  value: number
  title: string
  detail: string
}

export function getPortfolioGenerationProgress(elapsedMs: number): PortfolioGenerationProgress {
  if (elapsedMs < 6_000) {
    return { value: 12, title: 'Preparing your portrait', detail: 'Checking the crop and protecting your identity.' }
  }
  if (elapsedMs < 18_000) {
    return { value: 42, title: 'Creating your editorial portrait', detail: 'Adding corporate styling and a studio background.' }
  }
  if (elapsedMs < 32_000) {
    return { value: 76, title: 'Applying the Top100 cover', detail: 'Setting the brand, headline and awardee details.' }
  }
  return { value: 92, title: 'Finishing your cover', detail: 'Preparing the final high-resolution image.' }
}

import { createSocialShareImage, socialImageSize } from '@/lib/social-share-image'

export const alt = 'Top100 Africa Future Leaders: Impact Beyond Recognition'
export const size = socialImageSize
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return createSocialShareImage()
}

import { Facebook, Globe, Instagram, Linkedin, Music2, Twitter, Youtube } from 'lucide-react'
import type { SocialLink } from '@/lib/profile-contact'
export function ProfileSocialIcon({ platform, className = 'size-5' }: { platform: SocialLink['platform']; className?: string }) {
  const Icon = { linkedin: Linkedin, facebook: Facebook, instagram: Instagram, twitter: Twitter, youtube: Youtube, tiktok: Music2, website: Globe }[platform]
  return <Icon className={className} aria-hidden="true" />
}
export function ProfileSocialLinks({ links = [] }: { links?: SocialLink[] }) {
  return <div className="mt-3 flex flex-wrap gap-2">{links.slice(0, 3).map(link => <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${link.platform} profile`} title={link.platform} className="flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 hover:border-orange-400 hover:text-orange-700"><ProfileSocialIcon platform={link.platform} /></a>)}</div>
}

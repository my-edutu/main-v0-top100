import type { buildProfileContent } from '@/lib/seo/profile-content'

type Props = { name: string; content: ReturnType<typeof buildProfileContent> }

export default function ProfileBiography({ name, content }: Props) {
  if (!content.biography) return null
  return (
    <section className="mb-10" aria-labelledby="profile-biography">
      <h2 id="profile-biography" className="text-xl font-semibold tracking-tight text-[#171412]">About {name}</h2>
      {content.introduction && <p className="mt-4 text-base leading-7 text-stone-700">{content.introduction}</p>}
      {content.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mt-5 space-y-4">
          {section.heading && <h3 className="text-base font-semibold text-[#25211D]">{section.heading}</h3>}
          {section.paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line text-base leading-7 text-stone-700">{paragraph}</p>)}
        </div>
      ))}
    </section>
  )
}

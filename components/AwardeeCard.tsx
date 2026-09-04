import { AvatarSVG } from '@/lib/avatars'

type AwardeeCardData = {
  name: string
  country?: string | null
  cohort?: string | null
  field_of_study?: string | null
  current_school?: string | null
  category?: string | null
  bio?: string | null
  bio30?: string | null
  interests?: string[] | null
}

interface AwardeeCardProps {
  awardee: AwardeeCardData
}

export const AwardeeCard: React.FC<AwardeeCardProps> = ({ awardee }) => {
  const interests = awardee.interests ?? []
  const primaryTag = awardee.cohort ?? awardee.field_of_study ?? awardee.current_school ?? awardee.category ?? ''
  const bio = awardee.bio ?? awardee.bio30

  return (
    <div className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 h-full flex flex-col">
      <div className="p-6 flex-1">
        <div className="flex items-start space-x-4">
          <div className="shrink-0">
            <AvatarSVG name={awardee.name} size={64} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{awardee.name}</h3>
            <div className="flex items-center mt-1 text-orange-400">
              <span className="text-sm">{awardee.country ?? 'Unknown'}</span>
            </div>
            {primaryTag && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-200">
                  {primaryTag}
                </span>
              </div>
            )}
          </div>
        </div>
        {bio && (
          <p className="mt-4 line-clamp-3 text-sm text-zinc-400">{bio}</p>
        )}
      </div>
      {interests.length > 0 && (
        <div className="border-t border-orange-400/20 bg-black/40 px-6 py-3 text-xs text-zinc-400">
          <span className="font-semibold text-orange-200">Focus:</span> {interests.slice(0, 3).join(', ')}
        </div>
      )}
    </div>
  )
}
import { AvatarSVG, flagEmoji } from '@/lib/avatars';
import { MapPin } from 'lucide-react';

interface Awardee {
  id: string;
  name: string;
  country: string;
  category: string;
  year: number;
  bio30?: string;
  photo_url?: string;
  featured?: boolean;
}

interface AwardeeCardProps {
  awardee: Awardee;
}

export const AwardeeCard: React.FC<AwardeeCardProps> = ({ awardee }) => {
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
              <span className="mr-1">{flagEmoji(awardee.country)}</span>
              <span className="text-sm">{awardee.country}</span>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-200">
                {awardee.category}
              </span>
            </div>
            {awardee.bio30 && (
              <p className="mt-3 text-sm text-zinc-300 line-clamp-3">
                {awardee.bio30}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
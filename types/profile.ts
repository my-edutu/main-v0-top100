export type SocialLinks = {
  website?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  medium?: string;
  threads?: string;
};

export type Achievement = {
  id: string;
  title: string;
  description?: string;
  organization?: string;
  recognition_date?: string;
  link?: string;
};

export type GalleryItem = {
  id: string;
  url: string;
  caption?: string;
};

export type UserProfile = {
  id: string;
  email?: string;
  role: string;
  full_name?: string;
  username?: string;
  headline?: string;

  bio?: string;
  current_school?: string;
  field_of_study?: string;
  graduation_year?: number;
  location?: string;
  avatar_url?: string;
  cover_image_url?: string;
  personal_email?: string;
  phone?: string;
  social_links?: SocialLinks | null;
  achievements?: Achievement[] | null;
  gallery?: GalleryItem[] | null;
  video_links?: string[] | null;
  interests?: string[] | null;
  mentor?: string | null;
  cohort?: string | null;
  slug?: string | null;
  is_public: boolean;
  metadata?: Record<string, unknown> | null;
  last_seen_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserNotification = {
  id: string;
  title: string;
  body?: string;
  category?: string;
  cta_label?: string;
  cta_url?: string;
  scheduled_for?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AwardeeDirectoryEntry = {
  awardee_id: string;
  profile_id: string | null;
  slug: string;
  name: string;
  email?: string | null;
  country?: string | null;
  current_school?: string | null;
  field_of_study?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  headline?: string | null;

  personal_email?: string | null;
  phone?: string | null;
  location?: string | null;
  achievements?: Achievement[] | null;
  gallery?: GalleryItem[] | null;
  video_links?: string[] | null;
  social_links?: SocialLinks | null;
  interests?: string[] | null;
  cohort?: string | null;
  metadata?: Record<string, unknown> | null;
  cgpa?: string | null;
  year?: number | null;
  featured?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_public: boolean;
  role?: string | null;
  mentor?: string | null;
  course?: string | null;
  impact_projects?: number | null;
  lives_impacted?: number | null;
  awards_received?: number | null;
  youtube_video_url?: string | null;
};

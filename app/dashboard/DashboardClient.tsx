"use client";

import { useState, useTransition, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Sparkles,
  Star,
  Trophy,
  Upload,
  User,
  UserCheck,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import AvatarUpload from '@/components/AvatarUpload';
import { profileUpdateSchema } from '@/lib/dashboard/profile-schemas';
import type { UserNotification, UserProfile } from '@/types/profile';
import type { ProfileFormValues } from './actions';
import {
  dismissNotificationAction,
  markNotificationReadAction,
  updateProfileAction,
} from './actions';

const socialLinkKeys = [
  'website',
  'linkedin',
  'twitter',
  'instagram',
  'facebook',
  'youtube',
  'medium',
  'threads',
] as const;

type SocialLinkKey = typeof socialLinkKeys[number];

const labelMap: Record<SocialLinkKey, string> = {
  website: 'Website',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  medium: 'Medium',
  threads: 'Threads',
};

const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const mapProfileToFormValues = (profile: UserProfile, fallbackName: string): ProfileFormValues => {
  const fullName =
    profile.full_name && profile.full_name.trim().length > 0 ? profile.full_name : fallbackName;
  const social = socialLinkKeys.reduce<Record<SocialLinkKey, string>>((acc, key) => {
    const value = profile.social_links?.[key];
    acc[key] = value ?? '';
    return acc;
  }, {} as Record<SocialLinkKey, string>);

  return {
    fullName,
    username: profile.username ?? '',
    headline: profile.headline ?? '',

    bio: profile.bio ?? '',
    currentSchool: profile.current_school ?? '',
    fieldOfStudy: profile.field_of_study ?? '',
    graduationYear: profile.graduation_year ?? undefined,
    location: profile.location ?? '',
    avatarUrl: profile.avatar_url ?? '',
    coverImageUrl: profile.cover_image_url ?? '',
    personalEmail: profile.personal_email ?? '',
    phone: profile.phone ?? '',
    mentor: profile.mentor ?? '',
    cohort: profile.cohort ?? '',
    interests: profile.interests ?? [],
    socialLinks: social,
    achievements:
      profile.achievements?.map((achievement) => ({
        id: achievement.id ?? createClientId(),
        title: achievement.title,
        description: achievement.description ?? '',
        organization: achievement.organization ?? '',
        recognition_date: achievement.recognition_date ?? '',
        link: achievement.link ?? '',
      })) ?? [],
    videoLinks: profile.video_links ?? [],
    isPublic: profile.is_public ?? true,
    slug: profile.slug ?? '',
  };
};

type DashboardClientProps = {
  currentUser: {
    id: string;
    email: string;
    name: string;
  };
  initialProfile: UserProfile;
  initialNotifications: UserNotification[];
};

const isDemoPlaceholder = (value: string) => value === 'dev-user';

const humanizeCategory = (category?: string) => {
  if (!category) return 'General';
  const lower = category.toLowerCase();
  if (lower === 'event') return 'Event';
  if (lower === 'news') return 'News';
  if (lower === 'opportunity') return 'Opportunity';
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const iconForCategory = (category?: string) => {
  switch ((category ?? 'general').toLowerCase()) {
    case 'event':
      return Clock;
    case 'news':
      return Globe;
    case 'opportunity':
      return Sparkles;
    default:
      return Bell;
  }
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Collapsible Card Component
const CollapsibleCard = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  subtitle = ""
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  subtitle?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Card className="border-white/10 bg-zinc-950/70 backdrop-blur-xl shadow-[0_16px_50px_rgba(12,10,9,0.45)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(255,120,0,0.18)]">
      <CardHeader 
        className="cursor-pointer p-4 border-b border-white/5 bg-gradient-to-r from-white/5 via-transparent to-transparent transition-colors hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/40 via-orange-400/10 to-transparent text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                {title}
                {subtitle && <span className="text-xs font-normal text-white/60">({subtitle})</span>}
              </CardTitle>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="p-4 bg-white/5">
          {children}
        </CardContent>
      )}
    </Card>
  );
};

export default function DashboardClient({ currentUser, initialProfile, initialNotifications }: DashboardClientProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [notifications, setNotifications] = useState<UserNotification[]>(initialNotifications);
  const [interestInput, setInterestInput] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [isSubmitting, startTransition] = useTransition();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDemoProfile = isDemoPlaceholder(profile.id);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    mode: 'onChange',
    defaultValues: mapProfileToFormValues(initialProfile, currentUser.name),
  });

  const achievements = useFieldArray({ control: form.control, name: 'achievements' });
  const gallery = useFieldArray({ control: form.control, name: 'gallery' });

  const videoLinks = form.watch('videoLinks') ?? [];
  const interests = form.watch('interests') ?? [];
  const slugValue = form.watch('slug');
  const isPublic = form.watch('isPublic');

  const viewProfileUrl = profile.slug ? `/awardees/${profile.slug}` : null;
  
  useEffect(() => {
    if (!viewProfileUrl) {
      setShareUrl(null);
      return;
    }

    if (typeof window === 'undefined') {
      setShareUrl(viewProfileUrl);
      return;
    }

    try {
      const absolute = new URL(viewProfileUrl, window.location.origin);
      setShareUrl(absolute.toString());
    } catch {
      setShareUrl(viewProfileUrl);
    }
  }, [viewProfileUrl]);

  const handleQuickSave = () => form.handleSubmit(handleSubmit)();
  const pendingNotifications = notifications.filter((item) => !item.read_at);

  const handleUploadHint = () => {
    toast.info('Use the admin media uploader to host images, then paste the public URL here.');
  };

  const addInterestTag = () => {
    const trimmed = interestInput.trim();
    if (!trimmed) return;
    if (interests.includes(trimmed)) {
      toast.info('Interest already added');
      return;
    }
    if (interests.length >= 16) {
      toast.warning('You can add up to 16 interests.');
      return;
    }
    form.setValue('interests', [...interests, trimmed], { shouldDirty: true });
    setInterestInput('');
  };

  const removeInterestTag = (tag: string) => {
    form.setValue(
      'interests',
      interests.filter((item) => item !== tag),
      { shouldDirty: true },
    );
  };

  const addVideoLink = () => {
    const trimmed = videoInput.trim();
    if (!trimmed) return;
    if (videoLinks.includes(trimmed)) {
      toast.info('Video already listed');
      return;
    }
    if (videoLinks.length >= 8) {
      toast.warning('You can highlight up to 8 videos.');
      return;
    }
    form.setValue('videoLinks', [...videoLinks, trimmed], { shouldDirty: true });
    setVideoInput('');
  };

  const updateVideoLink = (index: number, value: string) => {
    const copy = [...videoLinks];
    copy[index] = value;
    form.setValue('videoLinks', copy, { shouldDirty: true });
  };

  const removeVideoLink = (index: number) => {
    const copy = [...videoLinks];
    copy.splice(index, 1);
    form.setValue('videoLinks', copy, { shouldDirty: true });
  };

  const handleSubmit = (values: ProfileFormValues) => {
    if (isDemoProfile) {
      toast.error('Sign in to save your profile first.');
      return;
    }

    startTransition(async () => {
      const payload = {
        ...values,
        graduationYear:
          typeof values.graduationYear === 'number'
            ? values.graduationYear
            : values.graduationYear
              ? Number(values.graduationYear)
              : undefined,
      };

      const response = await updateProfileAction({ profileId: profile.id, payload });

      if (!response.success) {
        toast.error(response.message ?? 'Unable to save profile right now.');
        return;
      }

      toast.success('Profile updated');

      setProfile((prev) => {
        const cleanedSocialLinks =
          values.socialLinks &&
          Object.entries(values.socialLinks).reduce<Record<string, string>>((acc, [key, value]) => {
            if (!value) return acc;
            acc[key] = value;
            return acc;
          }, {});

        return {
          ...prev,
          full_name: values.fullName,
          username: values.username || undefined,
          headline: values.headline || undefined,

          bio: values.bio || undefined,
          current_school: values.currentSchool || undefined,
          field_of_study: values.fieldOfStudy || undefined,
          graduation_year: values.graduationYear ?? undefined,
          location: values.location || undefined,
          avatar_url: values.avatarUrl || undefined,
          cover_image_url: values.coverImageUrl || undefined,
          personal_email: values.personalEmail || undefined,
          phone: values.phone || undefined,
          mentor: values.mentor || undefined,
          cohort: values.cohort || undefined,
          interests: values.interests && values.interests.length ? values.interests : null,
          social_links:
            cleanedSocialLinks && Object.keys(cleanedSocialLinks).length
              ? (cleanedSocialLinks as UserProfile['social_links'])
              : null,
          achievements: values.achievements?.length ? values.achievements : null,
          video_links: values.videoLinks?.length ? values.videoLinks : null,
          is_public: values.isPublic,
          slug: response.slug ?? values.slug ?? undefined,
        };
      });

      if (response.slug && response.slug !== values.slug) {
        form.setValue('slug', response.slug);
      }
    });
  };

  const markNotification = (notificationId: string) => {
    if (isDemoProfile) {
      toast.error('Sign in to manage notifications.');
      return;
    }

    startTransition(async () => {
      const response = await markNotificationReadAction({ notificationId });
      if (response.success) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item,
          ),
        );
      } else {
        toast.error('Unable to mark notification as read. Try again.');
      }
    });
  };

  const dismissNotification = (notificationId: string) => {
    if (isDemoProfile) {
      toast.error('Sign in to manage notifications.');
      return;
    }

    startTransition(async () => {
      const response = await dismissNotificationAction({ notificationId });
      if (response.success) {
        setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      } else {
        toast.error('Unable to dismiss notification right now.');
      }
    });
  };

  const addAchievement = () => {
    achievements.append({
      id: createClientId(),
      title: '',
      description: '',
      organization: '',
      recognition_date: '',
      link: '',
    });
  };

  const addGalleryItem = () => {
    gallery.append({
      id: createClientId(),
      url: '',
      caption: '',
    });
  };

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white">
      <div 
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at ${50 + (mousePosition.x / dimensions.width) * 10}% ${50 + (mousePosition.y / dimensions.height) * 10}%, rgba(255, 120, 0, 0.08), transparent 70%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,120,0,0.12),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(80,160,255,0.12),transparent_55%)]" />
      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-12 lg:px-6">
        {/* Dashboard Header */}
        <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/25 via-amber-500/10 to-zinc-950 p-8 text-white shadow-[0_40px_90px_rgba(255,120,0,0.25)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35)_0%,transparent_55%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-100">
                <Sparkles className="h-3 w-3" />
                Welcome
              </span>
              <h1 className="text-4xl font-semibold sm:text-5xl">
                {profile.full_name ? `Hi, ${profile.full_name.split(' ')[0]}!` : `Hi, ${currentUser.name || 'Leader'}!`}
              </h1>
              <p className="text-sm text-orange-50/80 sm:text-base">
                Build a vibrant profile, drop in your latest wins, and stay ready for new opportunities. No clutter, just the essentials.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={handleQuickSave}
                  disabled={isSubmitting || isDemoProfile}
                  className="bg-white text-zinc-900 hover:bg-orange-100"
                >
                  {isSubmitting ? 'Saving...' : 'Save profile changes'}
                </Button>
                {viewProfileUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    <Link href={viewProfileUrl} target="_blank" rel="noopener noreferrer">
                      View public profile
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    className="border-white/20 text-white/60"
                  >
                    Publish to get a public link
                  </Button>
                )}
              </div>
              {isDemoProfile && (
                <p className="text-xs text-white/70">
                  Sign in to sync your updates with the live directory.
                </p>
              )}
            </div>
            <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2">
              <Card className="border-white/20 bg-white/10 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide text-white/70">
                    Profile status
                  </CardDescription>
                  <CardTitle className="text-2xl text-white">
                    {profile.is_public ? 'Visible' : 'Hidden'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-white/70">
                  Toggle visibility anytime in your profile section below.
                </CardContent>
              </Card>
              <Card className="border-white/20 bg-white/10 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide text-white/70">
                    New notifications
                  </CardDescription>
                  <CardTitle className="text-2xl text-white">
                    {pendingNotifications.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-white/70">
                  {pendingNotifications.length
                    ? 'Review and mark them as done.'
                    : 'You are all caught up!'}
                </CardContent>
              </Card>
              <Card className="sm:col-span-2 border-white/20 bg-gradient-to-r from-white/15 to-transparent backdrop-blur">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">
                      Need a media link?
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      Use the admin media uploader, then paste the URL in your profile fields.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleUploadHint}
                    className="border-white bg-white text-zinc-900 hover:bg-orange-100"
                  >
                    Show upload instructions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <div className="mb-10 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="border-white/10 bg-zinc-950/70 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <LinkIcon className="h-5 w-5 text-orange-300" />
                Share your public profile
              </CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                Send this link to collaborators, partners, or the press. Anyone with the link can view your Africa Future Leaders bio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  readOnly
                  value={shareUrl ?? 'Complete your profile to generate a public link.'}
                  className="flex-1 border-white/10 bg-black/40 text-white"
                />
                <div className="flex w-full gap-2 md:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-orange-400/50 text-orange-100 hover:bg-orange-500/10 md:flex-none"
                    onClick={handleCopyShareUrl}
                    disabled={!shareUrl}
                  >
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 bg-orange-600 text-white hover:bg-orange-500 md:flex-none"
                    disabled={!viewProfileUrl}
                    onClick={() => {
                      if (viewProfileUrl) {
                        if (typeof window !== 'undefined') {
                          window.open(viewProfileUrl, '_blank', 'noopener,noreferrer');
                        } else {
                          toast.info('Open the profile link using the button above.');
                        }
                      }
                    }}
                  >
                    View profile
                  </Button>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Customize the ending of your link in the <span className="font-medium text-orange-200">Public URL slug</span> field below.
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-zinc-950/70 backdrop-blur md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Need more reach?</CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                Keep your profile public so it appears in the awardees directory and gets highlighted across Top100 Africa Future Leaders channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              <ul className="list-disc space-y-2 pl-5">
                <li>Profiles update instantly when you save changes.</li>
                <li>Anyone visiting your link sees the latest bio, media, and achievements.</li>
                <li>Flip off visibility if you want to take a break — you can always republish.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Profile Card */}
            <CollapsibleCard 
              title="Profile & Visibility" 
              icon={User}
              subtitle="Personal details"
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input placeholder="First and last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Preferred handle" {...field} />
                          </FormControl>
                          <FormDescription>Used for future personalized URLs.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="headline"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Headline</FormLabel>
                          <FormControl>
                            <Input placeholder="Social entrepreneur advocating for inclusive education" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About you</FormLabel>
                        <FormControl>
                          <Textarea rows={4} placeholder="Share your story, impact, and future goals" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="bg-zinc-800/80" />

                  <section>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-white">Spotlight videos</h3>
                        <p className="text-xs text-zinc-400">Drop YouTube or Vimeo links to amplify your story.</p>
                      </div>
                      <Badge variant="outline" className="border-orange-400/40 text-orange-200">Max 8 links</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Input
                        value={videoInput}
                        onChange={(event) => setVideoInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addVideoLink();
                          }
                        }}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full sm:w-auto sm:flex-1"
                      />
                      <Button type="button" variant="secondary" onClick={addVideoLink}>
                        Add video
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {videoLinks.length === 0 && (
                        <div className="rounded-lg border border-dashed border-zinc-700 bg-black/40 p-4 text-sm text-zinc-500">
                          No videos yet. Paste a link above.
                        </div>
                      )}
                      {videoLinks.map((link, index) => (
                        <div key={`${link}-${index}`} className="flex flex-col gap-2 rounded-lg border border-zinc-800/80 bg-black/40 p-4 sm:flex-row sm:items-center">
                          <Input
                            value={link}
                            onChange={(event) => updateVideoLink(index, event.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm" className="border-orange-500/40 text-orange-200">
                              <Link href={link} target="_blank" rel="noopener noreferrer">
                                Preview
                                <ArrowUpRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-zinc-500 hover:text-white"
                              onClick={() => removeVideoLink(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </form>
              </Form>
            </CollapsibleCard>

            {/* Academic & Professional Card */}
            <CollapsibleCard 
              title="Academic & Professional Info" 
              icon={UserCheck}
              subtitle="Education & career"
              defaultOpen={false}
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="currentSchool"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current school</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Harvard University" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fieldOfStudy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Field of study</FormLabel>
                          <FormControl>
                            <Input placeholder="International Relations" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="graduationYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Graduation year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1950}
                              max={2100}
                              value={field.value ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                field.onChange(value ? Number(value) : undefined);
                              }}
                              placeholder="2025"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Lagos, Nigeria" {...field} />
                          </FormControl>
                          <FormDescription>Displayed publicly alongside your profile.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mentor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mentor / Advisor</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cohort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cohort</FormLabel>
                          <FormControl>
                            <Input placeholder="Top100 AFL 2025" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </CollapsibleCard>

            {/* Social Media Card */}
            <CollapsibleCard 
              title="Social Media & Contact" 
              icon={LinkIcon}
              subtitle="Connect with others"
              defaultOpen={false}
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="personalEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred contact email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Photo</FormLabel>
                          <FormControl>
                            <AvatarUpload
                              value={field.value}
                              onChange={field.onChange}
                              onFileChange={() => {}} // Will handle file in the component itself
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormDescription>Upload your profile photo (JPG, PNG, max 5MB)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="coverImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cover image URL</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input placeholder="https://..." {...field} />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={handleUploadHint}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>Used on the awardees detail page hero.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="bg-zinc-800/80" />

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                          <LinkIcon className="h-4 w-4 text-orange-300" /> Social presence
                        </h3>
                        <p className="text-xs text-zinc-400">Highlight where people can follow your work.</p>
                      </div>
                      <Badge variant="outline" className="border-orange-500/40 text-orange-300">
                        Optional
                      </Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {socialLinkKeys.map((key) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name={`socialLinks.${key}` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{labelMap[key]}</FormLabel>
                              <FormControl>
                                <Input placeholder={`https://${key === 'website' ? 'yourdomain' : key}.com/...`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </section>
                </form>
              </Form>
            </CollapsibleCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Achievements Card */}
            <CollapsibleCard 
              title="Achievements & Milestones" 
              icon={Trophy}
              subtitle="Your accomplishments"
              defaultOpen={false}
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">Achievements</h3>
                      <p className="text-xs text-zinc-400">Celebrate awards, recognitions, and milestones.</p>
                    </div>
                    <Button type="button" size="sm" variant="secondary" onClick={addAchievement}>
                      <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {achievements.fields.length === 0 && (
                      <div className="rounded-lg border border-dashed border-zinc-700 bg-black/40 p-6 text-center text-sm text-zinc-500">
                        No achievements yet. Add your first accomplishment.
                      </div>
                    )}
                    {achievements.fields.map((field, index) => (
                      <div key={field.id} className="rounded-lg border border-zinc-800/80 bg-black/40 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-white">Achievement {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-zinc-500 hover:text-white"
                            onClick={() => achievements.remove(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`achievements.${index}.title` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Winner, African Leadership Award" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`achievements.${index}.organization` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organization</FormLabel>
                                <FormControl>
                                  <Input placeholder="Organizing body" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`achievements.${index}.recognition_date` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Year / Date</FormLabel>
                                <FormControl>
                                  <Input placeholder="2024" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`achievements.${index}.link` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Reference link</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`achievements.${index}.description` as const}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea rows={3} placeholder="What did this recognition mean for you?" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </form>
              </Form>
            </CollapsibleCard>



            {/* Interests Card */}
            <CollapsibleCard 
              title="Interests & Focus Areas" 
              icon={Star}
              subtitle="What drives you"
              defaultOpen={false}
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormLabel className="text-sm font-medium text-white">Interests & focus areas</FormLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={interestInput}
                      onChange={(event) => setInterestInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addInterestTag();
                        }
                      }}
                      placeholder="Leadership, Policy, STEM"
                      className="w-full sm:w-auto sm:flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={addInterestTag}>
                      Add interest
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">Press enter to add up to 16 keywords.</p>
                  <div className="flex flex-wrap gap-2">
                    {interests.length === 0 && (
                      <span className="text-xs text-zinc-500">No interests yet.</span>
                    )}
                    {interests.map((tag) => (
                      <Badge key={tag} variant="outline" className="flex items-center gap-2 border-orange-500/40 text-orange-200">
                        {tag}
                        <button type="button" onClick={() => removeInterestTag(tag)} className="text-orange-200/70 hover:text-orange-200">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </form>
              </Form>
            </CollapsibleCard>

            {/* Visibility & Privacy Card */}
            <CollapsibleCard 
              title="Visibility & Privacy" 
              icon={Eye}
              subtitle="Public settings"
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <section className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-black/40 p-4">
                            <div>
                              <p className="text-sm font-medium text-white">Show profile publicly</p>
                              <p className="text-xs text-zinc-400">
                                When enabled, your updates sync instantly with the awardees directory.
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Public URL slug</FormLabel>
                          <FormControl>
                            <div className="flex overflow-hidden rounded-lg border border-zinc-800/80 bg-black/40">
                              <span className="flex items-center px-3 text-sm text-zinc-500">/awardees/</span>
                              <Input
                                {...field}
                                className="flex-1 border-0 bg-transparent"
                                placeholder="your-name"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>Shareable link to your public profile.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>

                  <Separator className="bg-zinc-800/80" />

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-zinc-500">
                      Last synced: {profile.updated_at ? formatDate(profile.updated_at) : 'Not synced yet'}
                    </p>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save changes'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CollapsibleCard>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mt-6">
          <CollapsibleCard 
            title="Notifications & Activity" 
            icon={Bell}
            subtitle={`${pendingNotifications.length} new`}
          >
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-700 bg-black/40 p-6 text-center text-sm text-zinc-500">
                  No notifications yet. Check back soon for new updates.
                </div>
              ) : (
                <ScrollArea className="max-h-[420px] pr-3">
                  <div className="space-y-4">
                    {notifications.map((notification) => {
                      const Icon = iconForCategory(notification.category);
                      const isRead = Boolean(notification.read_at);

                      return (
                        <div
                          key={notification.id}
                          className={`rounded-lg border bg-black/40 p-4 ${
                            isRead ? 'border-zinc-800/60' : 'border-orange-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <span
                                className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full ${
                                  isRead ? 'bg-zinc-800 text-zinc-400' : 'bg-orange-500/20 text-orange-300'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-medium text-white">{notification.title}</h4>
                                  <Badge variant="outline" className="border-orange-500/40 text-orange-200">
                                    {humanizeCategory(notification.category)}
                                  </Badge>
                                </div>
                                {notification.body && (
                                  <p className="mt-1 text-sm text-zinc-400">{notification.body}</p>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                                  {notification.delivered_at && (
                                    <span>Sent {formatDate(notification.delivered_at)}</span>
                                  )}
                                  {notification.scheduled_for && (
                                    <span>Starts {formatDate(notification.scheduled_for)}</span>
                                  )}
                                </div>
                                {notification.cta_url && (
                                  <Button asChild variant="link" className="mt-3 h-auto p-0 text-orange-300">
                                    <Link href={notification.cta_url} target="_blank" rel="noopener noreferrer">
                                      {notification.cta_label ?? 'Open resource'}
                                      <ArrowUpRight className="ml-1 h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isRead && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-zinc-300 hover:text-white"
                                  onClick={() => markNotification(notification.id)}
                                  disabled={isSubmitting}
                                >
                                  Mark read
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-zinc-500 hover:text-white"
                                onClick={() => dismissNotification(notification.id)}
                                disabled={isSubmitting}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CollapsibleCard>
        </div>
      </div>
    </div>
  );
}
  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Profile link copied');
    } catch (error) {
      console.error('[dashboard] failed to copy profile url', error);
      toast.error('Unable to copy link. Please copy it manually.');
    }
  };

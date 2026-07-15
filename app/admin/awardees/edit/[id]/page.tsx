'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Upload,
  Star,
  User,
  FileText,
  Sparkles,
  Link2,
  Newspaper
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Awardee {
  id: string;
  slug: string;
  name: string;
  email?: string;
  country?: string;
  cgpa?: string | number;
  course?: string;
  bio?: string;
  year?: number;
  image_url?: string;
  featured?: boolean;
  headline?: string;
  tagline?: string;
  social_links?: Record<string, string>;
  achievements?: string[];
  avatar_url?: string;
  linkedin_post_url?: string;
}

const awardeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  country: z.string().optional(),
  cgpa: z.string().optional(),
  course: z.string().optional(),
  bio: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  image_url: z.string().optional(),
  featured: z.boolean().optional(),
  headline: z.string().optional(),
  tagline: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
  linkedin_post_url: z.string().optional(),
});

type AwardeeFormValues = z.infer<typeof awardeeSchema>

export default function EditAwardeePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [awardee, setAwardee] = useState<Awardee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<AwardeeFormValues>({
    resolver: zodResolver(awardeeSchema),
    defaultValues: {
      name: '',
      email: '',
      country: '',
      cgpa: '',
      course: '',
      bio: '',
      year: 2025,
      image_url: '',
      featured: false,
      headline: '',
      tagline: '',
      linkedin: '',
      twitter: '',
      github: '',
      website: '',
      linkedin_post_url: '',
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      const unwrappedParams = await params;
      fetchAwardee(unwrappedParams);
    };

    fetchData();
  }, [params]);

  useEffect(() => {
    if (awardee) {
      setValue('name', awardee.name || '');
      setValue('email', awardee.email || '');
      setValue('country', awardee.country || '');
      setValue('cgpa', awardee.cgpa?.toString() || '');
      setValue('course', awardee.course || '');
      setValue('bio', awardee.bio || '');
      setValue('year', awardee.year || 2025);
      setValue('image_url', awardee.image_url || awardee.avatar_url || '');
      setValue('featured', awardee.featured || false);
      setValue('headline', awardee.headline || '');
      setValue('tagline', awardee.tagline || '');
      setValue('linkedin', awardee.social_links?.linkedin || '');
      setValue('twitter', awardee.social_links?.twitter || '');
      setValue('github', awardee.social_links?.github || '');
      setValue('website', awardee.social_links?.website || '');
      setValue('linkedin_post_url', awardee.linkedin_post_url || '');
    }
  }, [awardee, setValue]);

  const fetchAwardee = async (unwrappedParams: { id: string }) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/awardees/${unwrappedParams.id}`);
      if (!response.ok) throw new Error('Failed to fetch awardee');

      const data = await response.json();
      setAwardee(data);
    } catch (error) {
      console.error('Error fetching awardee:', error);
      toast.error('Failed to fetch awardee');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // Create a preview URL for display only (won't be saved to DB)
      const previewUrl = URL.createObjectURL(file);
      setValue('image_url', previewUrl);
    }
  };

  const onSubmit = async (data: AwardeeFormValues) => {
    try {
      setIsSubmitting(true);
      toast.loading('Updating awardee...', { id: 'update-awardee' });

      // If there's an image file to upload, handle it separately
      let imageUrl = data.image_url;

      if (imageFile) {
        // Upload image to Supabase Storage
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('awardee_id', awardee?.id || '');

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.imageUrl;
        } else {
          console.error('Image upload failed, continuing with existing image URL');
        }
      }

      // Prepare form data for API request
      const updateData = {
        id: awardee.id,
        name: data.name,
        email: data.email || null,
        country: data.country || null,
        cgpa: data.cgpa || null,
        course: data.course || null,
        bio: data.bio || null,
        year: data.year || 2025,
        image_url: imageUrl || null,
        avatar_url: imageUrl || null,
        slug: generateSlug(data.name),
        featured: data.featured || false,
        headline: data.headline || null,
        tagline: data.tagline || null,
        linkedin_post_url: data.linkedin_post_url || null,
        social_links: {
          linkedin: data.linkedin || '',
          twitter: data.twitter || '',
          github: data.github || '',
          website: data.website || '',
        }
      };

      const response = await fetch('/api/awardees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message, { id: 'update-awardee' });
        router.push('/admin/awardees');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error updating awardee:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update awardee', { id: 'update-awardee' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:py-8 pt-20 lg:pt-6 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!awardee) {
    return (
      <div className="max-w-4xl mx-auto py-20 pt-24 lg:pt-20 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-orange-400" />
        </div>
        <h2 className="text-lg font-bold text-zinc-800">Awardee not found</h2>
        <p className="text-sm text-zinc-500 mt-1 mb-4">This profile may have been removed.</p>
        <Button onClick={() => router.push('/admin/awardees')} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 pt-20 lg:pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/awardees')}
          className="text-zinc-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Directory
        </Button>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Edit Profile</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
          Edit <span className="text-orange-600">{awardee.name}</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Update the details for this awardee.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Details */}
          <Card className="lg:col-span-2 bg-white border border-orange-100 rounded-3xl shadow-sm">
            <CardHeader className="border-b border-orange-100 py-4">
              <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <User className="h-4 w-4 text-orange-500" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="text-sm font-medium text-zinc-700 mb-1.5 block">Name <span className="text-orange-500">*</span></label>
                  <Input id="name" {...register('name')} placeholder="Full name" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
                  {errors.name && <p className="text-sm text-rose-600 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="text-sm font-medium text-zinc-700 mb-1.5 block">Email</label>
                  <Input id="email" {...register('email')} type="email" placeholder="email@example.com" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
                  {errors.email && <p className="text-sm text-rose-600 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label htmlFor="country" className="text-sm font-medium text-zinc-700 mb-1.5 block">Country</label>
                  <Input id="country" {...register('country')} placeholder="Country" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
                  {errors.country && <p className="text-sm text-rose-600 mt-1">{errors.country.message}</p>}
                </div>

                <div>
                  <label htmlFor="cgpa" className="text-sm font-medium text-zinc-700 mb-1.5 block">CGPA</label>
                  <Input id="cgpa" {...register('cgpa')} placeholder="e.g., 4.8" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
                  {errors.cgpa && <p className="text-sm text-rose-600 mt-1">{errors.cgpa.message}</p>}
                </div>

                <div>
                  <label htmlFor="year" className="text-sm font-medium text-zinc-700 mb-1.5 block">Year</label>
                  <Input id="year" {...register('year', { valueAsNumber: true })} type="number" min="1900" max="2100" placeholder="e.g., 2024" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
                  {errors.year && <p className="text-sm text-rose-600 mt-1">{errors.year.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="course" className="text-sm font-medium text-zinc-700 mb-1.5 block">Course / Field</label>
                  <Input id="course" {...register('course')} placeholder="e.g., Computer Science" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
                  {errors.course && <p className="text-sm text-rose-600 mt-1">{errors.course.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Image */}
          <Card className="bg-white border border-orange-100 rounded-3xl shadow-sm">
            <CardHeader className="border-b border-orange-100 py-4">
              <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-orange-500" />
                Profile Image
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col items-center">
                {watch('image_url') ? (
                  <div className="relative mb-3 group">
                    <img
                      src={watch('image_url')}
                      alt="Awardee preview"
                      className="w-32 h-32 object-cover rounded-full border-4 border-orange-100"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
                    <ImageIcon className="h-10 w-10 text-orange-300" />
                  </div>
                )}
                <label htmlFor="image" className="w-full">
                  <div className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-dashed border-orange-200 bg-orange-50/50 text-sm font-medium text-orange-600 cursor-pointer hover:bg-orange-50 transition-colors">
                    <Upload className="h-4 w-4" />
                    Change image
                  </div>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-zinc-400 mt-2 text-center">JPG or PNG. Square images work best.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bio */}
        <Card className="bg-white border border-orange-100 rounded-3xl shadow-sm">
          <CardHeader className="border-b border-orange-100 py-4">
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              Bio & Description
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <label htmlFor="bio" className="text-sm font-medium text-zinc-700 mb-1.5 block">Bio / Description</label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Brief description of achievements and leadership..."
              rows={6}
              className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300"
            />
            {errors.bio && <p className="text-sm text-rose-600 mt-1">{errors.bio.message}</p>}
          </CardContent>
        </Card>

        {/* Featured Status */}
        <Card className="bg-white border border-orange-100 rounded-3xl shadow-sm">
          <CardHeader className="border-b border-orange-100 py-4">
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              Featured Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-3 rounded-xl bg-orange-50/50 border border-orange-100 p-4">
              <Switch
                id="featured"
                checked={watch('featured')}
                onCheckedChange={(checked) => setValue('featured', checked)}
              />
              <Label htmlFor="featured" className="cursor-pointer flex items-center gap-2 text-zinc-700">
                <Star className={`h-4 w-4 ${watch('featured') ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'}`} />
                <span>{watch('featured') ? 'Featured on homepage' : 'Not featured'}</span>
              </Label>
            </div>
            <p className="text-sm text-zinc-500 mt-3">
              Featured awardees appear in the &quot;Meet the Bold Minds Shaping Africa Tomorrow&quot; section on the homepage.
            </p>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="bg-white border border-orange-100 rounded-3xl shadow-sm">
          <CardHeader className="border-b border-orange-100 py-4">
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div>
              <label htmlFor="headline" className="text-sm font-medium text-zinc-700 mb-1.5 block">Headline</label>
              <Input id="headline" {...register('headline')} placeholder="e.g., Software Engineer & Community Builder" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
              <p className="text-xs text-zinc-400 mt-1">A brief professional title or role description</p>
            </div>

            <div>
              <label htmlFor="tagline" className="text-sm font-medium text-zinc-700 mb-1.5 block">Tagline</label>
              <Textarea id="tagline" {...register('tagline')} placeholder="e.g., Building technology solutions for African communities" rows={2} className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
              <p className="text-xs text-zinc-400 mt-1">A short inspiring statement or mission</p>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="bg-white border border-orange-100 rounded-3xl shadow-sm">
          <CardHeader className="border-b border-orange-100 py-4">
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-orange-500" />
              Social Links
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="linkedin" className="text-sm font-medium text-zinc-700 mb-1.5 block">LinkedIn</label>
                <Input id="linkedin" {...register('linkedin')} placeholder="https://linkedin.com/in/username" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
              </div>
              <div>
                <label htmlFor="twitter" className="text-sm font-medium text-zinc-700 mb-1.5 block">Twitter</label>
                <Input id="twitter" {...register('twitter')} placeholder="https://twitter.com/username" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
              </div>
              <div>
                <label htmlFor="github" className="text-sm font-medium text-zinc-700 mb-1.5 block">GitHub</label>
                <Input id="github" {...register('github')} placeholder="https://github.com/username" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
              </div>
              <div>
                <label htmlFor="website" className="text-sm font-medium text-zinc-700 mb-1.5 block">Website</label>
                <Input id="website" {...register('website')} placeholder="https://yourwebsite.com" className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Post */}
        <Card className="bg-white border border-orange-100 rounded-3xl shadow-sm">
          <CardHeader className="border-b border-orange-100 py-4">
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-orange-500" />
              Featured Post
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <label htmlFor="linkedin_post_url" className="text-sm font-medium text-zinc-700 mb-1.5 block">Post URL</label>
            <Input id="linkedin_post_url" {...register('linkedin_post_url')} placeholder="https://linkedin.com/posts/... or https://medium.com/..." className="border-zinc-200 focus:ring-orange-300 focus:border-orange-300" />
            <p className="text-xs text-zinc-400 mt-1">
              Paste a public post URL from LinkedIn, Medium, Twitter/X, a news article, or any other platform. This will appear as a featured post card on the awardee&apos;s profile.
            </p>
          </CardContent>
        </Card>

        {/* Sticky Save Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-white/90 backdrop-blur-md border-t border-orange-100 px-4 sm:px-8 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/awardees')}
              disabled={isSubmitting}
              className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-lg shadow-orange-200 font-bold">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Awardee'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
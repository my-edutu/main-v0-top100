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
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Upload,
  Star,
  Plus,
  X
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
      year: 2024,
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
      setValue('year', awardee.year || 2024);
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
        year: data.year || 2024,
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!awardee) {
    return <div>Awardee not found</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/awardees')}
              className="p-0 mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <CardTitle>Edit Awardee</CardTitle>
          <CardDescription>
            Update the details for {awardee.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name *</label>
                  <Input
                    {...register('name')}
                    placeholder="Full name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Country</label>
                  <Input
                    {...register('country')}
                    placeholder="Country"
                  />
                  {errors.country && (
                    <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">CGPA</label>
                  <Input
                    {...register('cgpa')}
                    placeholder="e.g., 4.8"
                  />
                  {errors.cgpa && (
                    <p className="text-sm text-red-600 mt-1">{errors.cgpa.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Course/Field</label>
                  <Input
                    {...register('course')}
                    placeholder="e.g., Computer Science"
                  />
                  {errors.course && (
                    <p className="text-sm text-red-600 mt-1">{errors.course.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Year</label>
                  <Input
                    {...register('year', { valueAsNumber: true })}
                    type="number"
                    min="1900"
                    max="2100"
                    placeholder="e.g., 2024"
                  />
                  {errors.year && (
                    <p className="text-sm text-red-600 mt-1">{errors.year.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Bio/Description</label>
                  <Textarea
                    {...register('bio')}
                    placeholder="Brief description of achievements and leadership..."
                    rows={6}
                  />
                  {errors.bio && (
                    <p className="text-sm text-red-600 mt-1">{errors.bio.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Image</label>
                  <div className="flex flex-col items-center">
                    {watch('image_url') ? (
                      <div className="relative mb-2">
                        <img
                          src={watch('image_url')}
                          alt="Awardee preview"
                          className="w-32 h-32 object-cover rounded-full border-2 border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 rounded-full flex items-center justify-center">
                          <div className="opacity-0 hover:opacity-100 transition-opacity duration-300">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                        <ImageIcon className="h-10 w-10 text-gray-500" />
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a profile image (JPG, PNG)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Status */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Featured Status</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={watch('featured')}
                  onCheckedChange={(checked) => setValue('featured', checked)}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  <div className="flex items-center">
                    <Star className={`h-4 w-4 mr-2 ${watch('featured') ? 'fill-amber-500 text-amber-500' : ''}`} />
                    <span>{watch('featured') ? 'Featured on homepage' : 'Not featured'}</span>
                  </div>
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Featured awardees appear in the "Meet the Bold Minds Shaping Africa Tomorrow" section on the homepage.
              </p>
            </div>

            {/* Profile Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Profile Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Headline</label>
                  <Input
                    {...register('headline')}
                    placeholder="e.g., Software Engineer & Community Builder"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A brief professional title or role description
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Tagline</label>
                  <Textarea
                    {...register('tagline')}
                    placeholder="e.g., Building technology solutions for African communities"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A short inspiring statement or mission
                  </p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">LinkedIn</label>
                  <Input
                    {...register('linkedin')}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Twitter</label>
                  <Input
                    {...register('twitter')}
                    placeholder="https://twitter.com/username"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">GitHub</label>
                  <Input
                    {...register('github')}
                    placeholder="https://github.com/username"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Website</label>
                  <Input
                    {...register('website')}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            {/* Featured Post */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Featured Post</h3>
              <div>
                <label className="text-sm font-medium mb-1 block">Post URL</label>
                <Input
                  {...register('linkedin_post_url')}
                  placeholder="https://linkedin.com/posts/... or https://medium.com/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste a public post URL from LinkedIn, Medium, Twitter/X, a news article, or any other platform. This will appear as a featured post card on the awardee's profile.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/awardees')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
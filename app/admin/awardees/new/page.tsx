'use client'

import { useState } from 'react';
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
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Upload,
  User,
  FileText
} from 'lucide-react';

const awardeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  country: z.string().optional(),
  cgpa: z.string().optional(),
  course: z.string().optional(),
  bio: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  image_url: z.string().optional(),
});

type AwardeeFormValues = z.infer<typeof awardeeSchema>

export default function CreateAwardeePage() {
  const router = useRouter();
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
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file);
      setValue('image_url', imageUrl);
    }
  };

  const onSubmit = async (data: AwardeeFormValues) => {
    try {
      setIsSubmitting(true);
      toast.loading('Creating awardee...', { id: 'create-awardee' });

      // If there's an image file, use FormData to handle file upload
      if (imageFile) {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('email', data.email || '');
        formData.append('country', data.country || '');
        formData.append('cgpa', data.cgpa || '');
        formData.append('course', data.course || '');
        formData.append('bio', data.bio || '');
        formData.append('year', data.year?.toString() || '2025');
        formData.append('image', imageFile);
        formData.append('slug', generateSlug(data.name));

        const response = await fetch('/api/awardees', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          toast.success(result.message, { id: 'create-awardee' });
          router.push('/admin/awardees');
        } else {
          throw new Error(result.message);
        }
      } else {
        // If no image file, use JSON request
        const createData = {
          name: data.name,
          email: data.email || null,
          country: data.country || null,
          cgpa: data.cgpa || null,
          course: data.course || null,
          bio: data.bio || null,
          year: data.year || 2025,
          image_url: data.image_url || null, // Remove the temporary preview URL
          slug: generateSlug(data.name)
        };

        const response = await fetch('/api/awardees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createData),
        });

        const result = await response.json();

        if (response.ok) {
          toast.success(result.message, { id: 'create-awardee' });
          router.push('/admin/awardees');
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error('Error creating awardee:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create awardee', { id: 'create-awardee' });
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
          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">New Profile</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
          Add New <span className="text-orange-600">Awardee</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Add a new Top100 Africa Future Leader to the directory.</p>
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
                    Upload image
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
                  Creating...
                </>
              ) : (
                'Create Awardee'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

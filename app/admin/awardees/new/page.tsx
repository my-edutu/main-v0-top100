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
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Upload
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
          <CardTitle>Add New Awardee</CardTitle>
          <CardDescription>
            Add a new Top100 Africa Future Leader
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
                    Creating...
                  </>
                ) : (
                  'Create Awardee'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
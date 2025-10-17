'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarUploadProps {
  value: string | undefined;
  onChange: (url: string) => void;
  onFileChange: (file: File) => void;
  disabled?: boolean;
}

export default function AvatarUpload({ value, onChange, onFileChange, disabled }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file (JPEG, PNG, etc.)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size exceeds 5MB limit');
        return;
      }

      // Create preview URL
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);
      onFileChange(file);

      // Upload the file to our API
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/profiles/avatar', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload image');
        }

        onChange(result.url); // Update the form field with the uploaded URL
        toast.success('Profile picture updated successfully!');
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(error.message || 'Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {previewUrl ? (
          <div className="relative">
            <img 
              src={previewUrl} 
              alt="Profile preview" 
              className="w-32 h-32 object-cover rounded-full border-2 border-gray-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 rounded-full flex items-center justify-center">
              <div className="opacity-0 hover:opacity-100 transition-opacity duration-300">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-500 text-center">
              <div className="mx-auto">
                <Upload className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-xs mt-1">No image</p>
            </div>
          </div>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
        disabled={isUploading || disabled}
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isUploading || disabled}
        className="flex items-center"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {previewUrl ? 'Change Image' : 'Upload Image'}
          </>
        )}
      </Button>
    </div>
  );
}
# Blog Image Upload Guide

This guide explains how to properly set up and use image uploads in blog posts with Supabase storage.

## Setup Requirements

### 1. Create Supabase Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to `Storage` > `Buckets`
3. Click `New bucket`
4. Enter bucket name: `uploads` (or another name if you prefer)
5. Configure bucket settings:
   - Public bucket: **No** (unless you specifically want all content to be public)
   - If not public, make sure to set proper policies (see below)

### 2. Configure Bucket Policies

If your bucket is NOT public, create these policies for image uploads:

```sql
-- For authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- For authenticated users to update images  
CREATE POLICY "Allow authenticated users to update images" ON storage.objects
FOR UPDATE TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- For everyone to read images (if you want images to be publicly accessible)
CREATE POLICY "Allow public read access to images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'uploads');
```

### 3. Environment Variables

Make sure your `.env` file has the following variables set:

```bash
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: specify different bucket name (defaults to 'uploads')
SUPABASE_UPLOADS_BUCKET=uploads
```

## How Image Upload Works

### 1. Uploading Images

- Images are uploaded through the `/api/uploads` endpoint
- This endpoint is used by both blog posts and other features
- Requires admin authentication (`requireAdmin`)
- Files are stored in the configured Supabase storage bucket
- Returns the public URL of the uploaded image

### 2. Storing Images in Database

- The public URL of the uploaded image is stored in the `cover_image` column of the `posts` table
- The URL is then used to display the image in the frontend

### 3. Displaying Images

- In the frontend, the `coverImage` property from the post data is used to display the image
- `Next/Image` component is used for optimized image loading

## Troubleshooting

### Images Not Showing?
1. Verify the storage bucket exists in your Supabase project
2. Check that the bucket policies allow reading (for public display) and writing (for uploads)
3. Confirm environment variables are set correctly
4. Check browser console for any error messages during image upload
5. Verify the image URL is correctly saved in the `cover_image` column of the posts table

### Upload Failing?
1. Check if the image file is too large (Supabase has size limits)
2. Verify admin authentication is working
3. Ensure the service role key has proper permissions
4. Check if the bucket exists and has correct name

## Security Notes

- The upload endpoint is protected and only accessible to admin users
- The service role key is used for direct storage access, which is appropriate for admin functionality
- If your bucket is public, anyone can access the stored images using the public URL
- If your bucket is private, you might need signed URLs for access (which would require code changes)

## Customizing the Bucket Name

If you want to use a different bucket name:
1. Create a bucket with your preferred name
2. Set the `SUPABASE_UPLOADS_BUCKET` environment variable to your bucket name
3. Update bucket policies accordingly
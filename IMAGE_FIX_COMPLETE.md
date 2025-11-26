# ✅ Image Upload Issue - FIXED

## What Was Broken

The admin panel image upload was saving **blob URLs** (temporary preview URLs like `blob:http://localhost:3000/...`) to the database instead of uploading images to Supabase Storage. These blob URLs break after page refresh, causing all images to appear broken.

## What I Fixed

### 1. **Created Image Upload API** (`/api/upload-image/route.ts`)
- New endpoint that properly uploads images to Supabase Storage
- Returns the permanent public URL for the uploaded image
- Handles file uploads with proper error handling

### 2. **Fixed Admin Edit Form** (`/admin/awardees/edit/[id]/page.tsx`)
- Now uploads the actual image file to Supabase Storage before saving
- Gets the permanent URL from Supabase and saves that to the database
- Preview still works, but the blob URL is never saved to the database

### 3. **Updated Next.js Config** (`next.config.mjs`)
- Added your Supabase domain (`zsavekrhfwrpqudhjvlq.supabase.co`) to allowed image sources
- Images from Supabase Storage can now load properly

### 4. **Added Error Handling** (`HomeFeaturedAwardees.tsx`)
- If an image URL fails to load, it shows a nice SVG avatar fallback
- No more broken image icons

## How It Works Now

1. **Admin uploads image** → File is uploaded to Supabase Storage
2. **Supabase returns URL** → Permanent URL like `https://zsavekrhfwrpqudhjvlq.supabase.co/storage/v1/object/public/awardees/12345-image.jpg`
3. **URL saved to database** → Both `image_url` and `avatar_url` fields updated
4. **Homepage displays image** → Fetches from Supabase Storage using the permanent URL

## What You Need To Do Now

### ⚠️ IMPORTANT: Restart Your Dev Server

The Next.js config changes require a server restart:

```bash
# Stop your server (Ctrl+C)
# Then restart:
npm run dev
```

### Re-Upload Your 5 Images

Since the previous uploads saved blob URLs (which are broken), you need to re-upload the images:

1. Go to `/admin/awardees`
2. Click "Edit" on each of the 5 awardees
3. Re-upload their images
4. Click "Update Awardee"

This time the images will be properly uploaded to Supabase Storage with permanent URLs!

### Verify Supabase Storage Bucket Exists

Make sure you have a storage bucket called `awardees` in Supabase:

1. Go to your Supabase dashboard
2. Navigate to **Storage** → **Buckets**
3. Check if `awardees` bucket exists
4. If not, create it:
   - Name: `awardees`
   - Public: ✓ (checked)

### Set Storage Permissions (If Needed)

If you get upload errors, add these policies in Supabase:

```sql
-- Allow public to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'awardees');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'awardees' AND auth.role() = 'authenticated');

-- Allow service role to upload (for admin operations)
CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'awardees' AND auth.role() = 'service_role');
```

## Testing

After restarting and re-uploading:

1. **Homepage** → Featured awardees should show images
2. **Refresh page** → Images should still load (not broken!)
3. **Check database** → `avatar_url` should have URLs like `https://zsavekrhfwrpqudhjvlq.supabase.co/storage/...`

## Files Changed

1. ✅ `app/api/upload-image/route.ts` - NEW file for image uploads
2. ✅ `app/admin/awardees/edit/[id]/page.tsx` - Fixed to upload images properly
3. ✅ `next.config.mjs` - Added Supabase domain for images
4. ✅ `app/components/HomeFeaturedAwardees.tsx` - Added error handling

## Summary

**Root Cause**: Admin edit form was saving temporary blob URLs instead of uploading to Supabase Storage

**Solution**: Created proper image upload flow that saves permanent Supabase Storage URLs

**Next Step**: Restart server + re-upload the 5 images = Images will work! 🎉

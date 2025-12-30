# Blog Image Fix Instructions

## Problem Summary
Images upload to Supabase successfully but don't display on the blog pages, and saving blog posts may fail with errors.

## Root Cause
The Supabase storage bucket is missing public read policies, causing images to be inaccessible to public viewers.

## Solution: Complete Setup Checklist

### Step 1: Fix Build Error ✅
The missing export has been fixed. Run the build to verify:
```bash
npm run build
```

### Step 2: Configure Supabase Storage (CRITICAL)

#### A. Check if Bucket Exists
1. Go to https://app.supabase.com/project/zsavekrhfwrpqudhjvlq/storage/buckets
2. Look for a bucket named `uploads`
3. If it doesn't exist, create it:
   - Click "New bucket"
   - Name: `uploads`
   - **Public bucket: YES** ← This is critical!
   - Click "Create bucket"

#### B. Set Up Storage Policies
Go to https://app.supabase.com/project/zsavekrhfwrpqudhjvlq/storage/policies

You need exactly 3 policies:

**Policy 1: Allow Authenticated Upload**
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');
```

**Policy 2: Allow Authenticated Update**
```sql
CREATE POLICY "Allow authenticated users to update"
ON storage.objects
FOR UPDATE
TO authenticated
WITH CHECK (bucket_id = 'uploads');
```

**Policy 3: Allow Public Read Access** (MOST IMPORTANT!)
```sql
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');
```

To create these policies:
1. Click on the `storage.objects` table in the policies view
2. Click "New policy"
3. Use "For full customization" option
4. Paste each SQL policy above
5. Click "Review" then "Save policy"

### Step 3: Test the Fix

#### A. Test Image Upload
1. Go to admin panel: http://localhost:3000/admin/blog/new
2. Upload a cover image
3. Check browser console for any errors
4. Note the image URL returned (should look like):
   ```
   https://zsavekrhfwrpqudhjvlq.supabase.co/storage/v1/object/public/uploads/editor/filename-timestamp.jpg
   ```

#### B. Test Image Display
1. Open the image URL directly in a new browser tab
2. You should see the image
3. If you get 403 Forbidden or 404 Not Found → Policies are not set correctly

#### C. Test Blog Post Save
1. Fill in all required fields (title, slug, content)
2. Upload a cover image
3. Click "Save changes" or "Publish post"
4. Check browser console for detailed error logs (we added these)
5. If successful, you should be redirected to the blog list

#### D. Test Image on Blog Page
1. Go to the blog listing page
2. Verify the cover image displays
3. Click on the blog post
4. Verify the cover image displays on the detail page

### Step 4: Verify the Fix

Run the following checklist:

- [ ] Storage bucket `uploads` exists
- [ ] Bucket is marked as PUBLIC
- [ ] 3 policies are created on `storage.objects` table
- [ ] Test upload returns a valid URL
- [ ] Opening the image URL directly shows the image (not 403/404)
- [ ] Blog post saves successfully with image
- [ ] Image displays on blog listing page
- [ ] Image displays on blog detail page
- [ ] Image displays on homepage blog section

## Common Errors and Solutions

### Error: "Storage bucket 'uploads' not found"
**Solution**: Create the bucket as described in Step 2A

### Error: "403 Forbidden" when accessing image
**Solution**: The public read policy is missing. Add Policy 3 from Step 2B

### Error: "Error updating post" when saving
**Check**:
1. Browser console for detailed error (we added logging)
2. Network tab for the actual API response
3. Supabase logs for database errors

### Images upload but don't show on pages
**Solution**:
1. Verify bucket is PUBLIC
2. Verify Policy 3 (public read access) exists
3. Test image URL directly in browser

## Debug Tools

### Check Current Policies
```sql
-- Run this in Supabase SQL Editor to see existing policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Check Bucket Configuration
```sql
-- Run this in Supabase SQL Editor to see bucket settings
SELECT * FROM storage.buckets WHERE name = 'uploads';
```

## Need More Help?

1. Check browser console for errors (F12)
2. Check Network tab to see API responses
3. Check Supabase logs at: https://app.supabase.com/project/zsavekrhfwrpqudhjvlq/logs/explorer

## Files Modified

- ✅ `lib/posts/server.ts` - Added missing export
- ✅ `app/admin/blog/edit/[id]/page.tsx` - Added detailed error logging

## Next Steps

Once you complete Steps 1-4 above:
1. Test creating a new blog post with an image
2. Test editing an existing blog post and changing the image
3. Verify all images display correctly across the site

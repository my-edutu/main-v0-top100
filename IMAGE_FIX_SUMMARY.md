# Awardee Images - Issue Fixed ✅

## Problem Identified

Your awardee images weren't displaying on the `/awardees` page because of a field mismatch.

### Root Cause
- **Database Fields**: Awardees have `image_url` and `avatar_url` fields
- **Homepage**: ✅ Correctly uses `avatar_url` - images show properly
- **Awardees Page**: ❌ Was looking for `cover_image_url` - which most awardees don't have

## What Was Fixed

### File Changed: `app/awardees/AwardeesPageClient.tsx`

**Before** (line 275-283):
```tsx
{person.cover_image_url && (
  <div className="absolute inset-0">
    <img
      src={person.cover_image_url}
      alt={person.name}
      className="..."
    />
  </div>
)}
```

**After** (FIXED):
```tsx
{/* Awardee image - use cover_image_url or avatar_url */}
{(person.cover_image_url || person.avatar_url) && (
  <div className="absolute inset-0">
    <img
      src={person.cover_image_url || person.avatar_url || ''}
      alt={person.name}
      className="..."
    />
  </div>
)}

{/* Fallback avatar if no image */}
{!person.cover_image_url && !person.avatar_url && (
  <div className="absolute inset-0 flex items-center justify-center">
    <AvatarSVG name={person.name} size={80} />
  </div>
)}
```

## How It Works Now

### Image Priority (in order):
1. **`cover_image_url`** - Full cover/banner image (from profiles table)
2. **`avatar_url`** - Profile/awardee avatar (from awardees/profiles tables)
3. **`AvatarSVG`** - Generated SVG fallback (if no images available)

### Where Images Show:
✅ **Homepage** - Featured awardees with `avatar_url`
✅ **Awardees Page** - All public awardees with `cover_image_url` OR `avatar_url`
✅ **Individual Profile Pages** - Uses whatever image is available

## Database Structure

Your awardees can have images in multiple fields:

```sql
-- Awardees Table
awardees.image_url      -- Legacy field
awardees.avatar_url     -- Main avatar field

-- Profiles Table (if awardee has account)
profiles.avatar_url     -- Profile avatar
profiles.cover_image_url -- Cover/banner image

-- Awardee Directory View (combines both)
avatar_url = COALESCE(
  profiles.avatar_url,
  awardees.avatar_url,
  awardees.image_url
)
```

## Testing Your Images

Run this diagnostic script to check your images:

```bash
npm run check-images
```

This will show you:
- How many awardees have images
- Which awardees are missing images
- Featured awardees status
- Storage bucket configuration
- Recommendations for improvement

## Verify the Fix

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Check homepage** (`http://localhost:3000`):
   - Featured awardees section should show images
   - If no featured awardees, mark some as featured in admin panel

3. **Check awardees page** (`http://localhost:3000/awardees`):
   - All awardees with images should display them
   - Awardees without images show generated SVG avatars

4. **Check individual profiles** (`http://localhost:3000/awardees/[slug]`):
   - Profile pages should show full images

## How to Add/Upload Images

### Via Admin Panel:
1. Go to `/admin/awardees`
2. Click "Edit" on an awardee
3. Upload an image in the image upload field
4. Save changes
5. Image is automatically stored in Supabase Storage

### Via Database (Direct):
```sql
-- Update awardee with image URL
UPDATE awardees
SET avatar_url = 'https://your-supabase.supabase.co/storage/v1/object/public/awardees/image.jpg'
WHERE slug = 'awardee-name';

-- Or update image_url
UPDATE awardees
SET image_url = 'https://your-supabase.supabase.co/storage/v1/object/public/awardees/image.jpg'
WHERE slug = 'awardee-name';
```

## Storage Bucket Setup

Make sure your Supabase storage is configured:

1. **Create Bucket** (if not exists):
   - Name: `awardees` or `uploads`
   - Public: ✓ (for viewing images)

2. **Set Policies**:
   ```sql
   -- Allow public to view images
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'awardees');

   -- Allow service role to upload
   CREATE POLICY "Service Role Upload"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'awardees' AND auth.role() = 'service_role');
   ```

3. **CORS Settings**:
   - Allow your domain
   - Allow localhost for development

## Image Best Practices

### Recommended Specifications:
- **Homepage Cards**: 400x600px (2:3 aspect ratio)
- **Awardees Page Cards**: 400x600px (2:3 aspect ratio)
- **Profile Page**: 800x600px or larger
- **Format**: JPG or WebP (best compression)
- **File Size**: < 500KB per image

### Optimization Tips:
```bash
# Use Next.js Image component for optimization
import Image from 'next/image'

<Image
  src={person.avatar_url}
  alt={person.name}
  width={400}
  height={600}
  className="object-cover"
/>
```

## Common Issues & Solutions

### Issue 1: Images still not showing
**Solution**:
- Run `npm run check-images` to diagnose
- Check if images exist in database
- Verify storage bucket is public
- Check browser console for errors

### Issue 2: Images are uploaded but URLs are wrong
**Solution**:
```sql
-- Get the correct public URL format from Supabase Storage
SELECT
  id,
  name,
  avatar_url,
  image_url
FROM awardees
WHERE avatar_url IS NOT NULL OR image_url IS NOT NULL
LIMIT 5;

-- URLs should look like:
-- https://[project].supabase.co/storage/v1/object/public/awardees/filename.jpg
```

### Issue 3: Some awardees show, others don't
**Solution**:
- Check `is_public` field (must be `true`)
- Check `featured` field for homepage
- Verify image URLs are valid

### Issue 4: Images are broken/404
**Solution**:
- Verify storage bucket exists and is public
- Check file actually exists in storage
- Verify correct bucket name in URLs

## Files Modified

1. ✅ `app/awardees/AwardeesPageClient.tsx` - Fixed to use avatar_url fallback
2. ✅ `scripts/check-awardee-images.ts` - New diagnostic tool
3. ✅ `package.json` - Added `npm run check-images` script

## Next Steps

1. ✅ **Fix Applied** - Code is updated
2. 🔄 **Restart Dev Server** - `npm run dev`
3. ✅ **Run Diagnostics** - `npm run check-images`
4. 📸 **Upload Missing Images** - Via admin panel
5. ⭐ **Mark Featured Awardees** - For homepage display
6. 🚀 **Deploy** - Push changes to production

## Summary

✅ **Homepage** - Already working correctly
✅ **Awardees Page** - NOW FIXED - will show images
✅ **Fallback System** - SVG avatars for missing images
✅ **Diagnostic Tool** - Check image status anytime

Your images should now display correctly on both the homepage AND the /awardees page!

---

**Need Help?**
- Run `npm run check-images` for detailed diagnostics
- Check browser console for image loading errors
- Verify Supabase storage bucket configuration
- Ensure awardees have `is_public = true`

# Supabase Storage Setup for Blog Images

## Critical Setup Steps

### 1. Create the Storage Bucket

1. Go to your Supabase Dashboard: https://zsavekrhfwrpqudhjvlq.supabase.co
2. Navigate to **Storage** → **Buckets**
3. Click **"New bucket"**
4. Set:
   - **Name**: `uploads`
   - **Public bucket**: **YES** (This is important!)
5. Click **Create bucket**

### 2. Set Up Storage Policies

Even if the bucket is public, you need to set up policies for read and write access.

Go to **Storage** → **Policies** and create these policies:

#### Policy 1: Allow Authenticated Users to Upload

```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');
```

#### Policy 2: Allow Authenticated Users to Update

```sql
CREATE POLICY "Allow authenticated users to update"
ON storage.objects
FOR UPDATE
TO authenticated
WITH CHECK (bucket_id = 'uploads');
```

#### Policy 3: Allow Public Read Access (CRITICAL for displaying images)

```sql
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');
```

### 3. Alternative: If Bucket Already Exists as Private

If you already created the bucket as private, you can either:

**Option A: Delete and recreate as public**
1. Delete all files from the bucket
2. Delete the bucket
3. Create a new public bucket named `uploads`
4. Apply the policies above

**Option B: Keep private and use signed URLs** (More complex)
- This would require code changes to generate signed URLs for each image
- Not recommended for blog images that need to be publicly accessible

## Testing the Setup

After setting up the bucket and policies:

1. **Upload a test image** through the admin panel
2. **Check the browser console** for any errors
3. **Verify the image URL** - it should look like:
   ```
   https://zsavekrhfwrpqudhjvlq.supabase.co/storage/v1/object/public/uploads/editor/filename-timestamp.jpg
   ```
4. **Open the image URL directly** in a new browser tab - it should display the image
5. If you get a 403 or 404 error, the policies are not set correctly

## Common Issues

### Images upload but don't display
- **Cause**: Public read policy not set
- **Fix**: Create the "Allow public read access" policy

### Upload fails with "bucket not found"
- **Cause**: Bucket doesn't exist or wrong name
- **Fix**: Create bucket named exactly `uploads`

### Upload fails with permission error
- **Cause**: Insert/Update policies not set for authenticated users
- **Fix**: Create the upload and update policies

## Checking Current Setup

To verify your current setup:

1. Go to **Storage** → **Buckets**
2. Click on the `uploads` bucket
3. Check if it says **"Public"** at the top
4. Go to **Storage** → **Policies**
5. Verify you have at least 3 policies for the `storage.objects` table:
   - One for INSERT (authenticated users)
   - One for UPDATE (authenticated users)
   - One for SELECT (public access)

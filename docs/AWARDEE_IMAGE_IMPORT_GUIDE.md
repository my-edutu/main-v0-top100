# Awardee Image Import Guide

This guide explains how to import images for awardees using Google image links.

## Overview

The script in `scripts/import-awardee-images.ts` allows you to automatically download images from Google links and upload them to Supabase storage, then update the corresponding awardee records with the new image URLs.

## Prerequisites

1. **Supabase Environment Variables**: Make sure your `.env.local` file contains:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **CSV File**: Create a CSV file with the following structure:
   ```
   awardee_id,image_url
   <awardee_id_1>,<google_image_url_1>
   <awardee_id_2>,<google_image_url_2>
   ...
   ```

## Steps to Import Images

1. **Prepare Your CSV File**:
   - Create or update the file at `scripts/awardee_images.csv`
   - Add rows with awardee IDs and their corresponding Google image URLs
   - Each row should have the awardee ID and a direct image URL

2. **Run the Import Script**:
   ```bash
   npm run build
   npx tsx scripts/import-awardee-images.ts
   ```

3. **Verify the Results**:
   - Check the console output for success/failure counts
   - Verify that images are accessible in the Supabase storage bucket
   - Confirm that awardee records have been updated with the image URLs

## Important Notes

- The script downloads images from provided URLs and uploads them to the 'awardees' bucket in Supabase storage
- Only direct image URLs work best (e.g., ending in .jpg, .png, etc.)
- Google Drive or other hosting services may require direct download links
- The original image URLs will be replaced with the Supabase storage URLs for better performance and reliability
- Make sure you have the necessary permissions to update awardee records

## Example CSV Content

```
awardee_id,image_url
12345,https://example.com/image1.jpg
67890,https://example.com/image2.png
```

## Troubleshooting

- If you see CORS errors, make sure the image URL allows cross-origin requests
- If downloads fail, verify that the URLs are direct image links
- Check Supabase logs if upload to storage is failing
- Ensure the 'awardees' storage bucket exists in your Supabase project
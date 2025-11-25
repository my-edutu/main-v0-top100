# YouTube Admin System Setup Guide

## Overview

The YouTube admin system has been fixed to give admins full control over the YouTube videos displayed on the homepage. Previously, the homepage used hardcoded fallback videos that couldn't be managed through the admin panel.

## What Was Fixed

### 1. **Homepage YouTube Section**
- **Before**: Used hardcoded fallback videos when the database was empty
- **After**: Displays only videos from the database (empty if no videos exist)
- **Location**: `app/components/RecentEventsSection.tsx`

### 2. **Admin YouTube Management**
- **Before**: Could manage database videos but homepage showed different hardcoded videos
- **After**: Admin changes immediately reflect on the homepage
- **Location**: `app/admin/youtube/page.tsx`

### 3. **Admin Dashboard Analytics**
- **Before**: Showed mock data for YouTube analytics
- **After**: Shows real YouTube video statistics with dedicated analytics section
- **Location**: `app/admin/page.tsx`

## Database Setup

### Step 1: Create the YouTube Videos Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Location: supabase/migrations/001_create_youtube_videos.sql

-- This will create the table and populate it with initial videos
```

**Option A: Using Supabase SQL Editor** (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and run the content from: `supabase/migrations/001_create_youtube_videos.sql`

**Option B: Using the full schema**
1. Run the complete schema file: `supabase/schema.sql`
2. This will create all tables including `youtube_videos`

### Step 2: Verify Table Creation

Run this query to verify:

```sql
SELECT * FROM public.youtube_videos ORDER BY created_at DESC;
```

You should see 4 initial videos:
- Leadership Summit 2024
- Innovation Workshop
- Community Impact Forum
- Awards Ceremony Highlights

## Admin Features

### YouTube Management Page (`/admin/youtube`)

**Features:**
- ✅ View all YouTube videos in a table with thumbnails
- ✅ Add new videos with title, description, date, and YouTube URL/ID
- ✅ Delete existing videos
- ✅ View analytics (total videos, views, average views, recent videos)
- ✅ Extract video ID from full YouTube URLs automatically
- ✅ Preview thumbnails before publishing

**Analytics Cards:**
1. **Total Videos** - Count of all videos in database
2. **Total Views** - Simulated total view count
3. **Avg. Views** - Average views per video
4. **Recent** - Videos added in last 3 months

### Admin Dashboard YouTube Section

The dashboard now shows:
- **Total Videos**: Number of YouTube videos in database
- **This Month**: Videos added in the current month
- **All Time**: Total count of all videos
- **Quick Actions**: Direct link to YouTube management page

### How to Add a YouTube Video

1. Navigate to `/admin/youtube`
2. Fill in the "Add New Video" form:
   - **Title**: Enter a descriptive title
   - **YouTube URL or Video ID**: Paste the full URL or just the 11-character video ID
   - **Date**: Enter a display date (e.g., "March 2024")
   - **Description**: (Optional) Add a description
3. Click "Add YouTube Video"
4. The video will immediately appear on the homepage

### How to Delete a Video

1. Navigate to `/admin/youtube`
2. Find the video in the table
3. Click the trash icon (🗑️)
4. Confirm deletion
5. The video is removed from both admin and homepage

## Homepage Integration

### Event Gallery Section (`/events`)

The homepage Event Gallery section (`app/components/RecentEventsSection.tsx`) now:
- ✅ Fetches videos directly from the database
- ✅ Shows actual YouTube titles using oEmbed API
- ✅ Displays thumbnails from YouTube
- ✅ Opens videos in a modal player
- ✅ Shows "No recent events videos available" when database is empty

**No Fallback Data**: The hardcoded fallback videos have been removed. If the database is empty, the section will show an empty state with a message.

## API Endpoints

### GET `/api/youtube`
- **Purpose**: Fetch all YouTube videos
- **Returns**: Array of video objects with actual YouTube titles
- **Used by**: Homepage, Admin YouTube page, Admin Dashboard

### POST `/api/youtube`
- **Purpose**: Add a new YouTube video
- **Requires**: Admin authentication
- **Body**: `{ title, videoId, date, description }`
- **Returns**: Success message and created video

### DELETE `/api/youtube?id={videoId}`
- **Purpose**: Delete a YouTube video
- **Requires**: Admin authentication
- **Returns**: Success message

## Database Schema

```sql
create table public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_id text not null unique,
  date text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
```

## Testing the Setup

### 1. Test Database Connection
- Go to `/admin/youtube`
- You should see the initial 4 videos (after running migration)
- If you see an error, check Supabase connection

### 2. Test Adding a Video
- Click "Add New Video"
- Enter:
  - Title: "Test Video"
  - URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
  - Date: "December 2024"
- Click "Add YouTube Video"
- Verify it appears in the table

### 3. Test Homepage Display
- Navigate to the homepage (`/`)
- Scroll to "Event Gallery" section
- Verify all videos from admin panel appear
- Click a video to test the modal player

### 4. Test Deletion
- In `/admin/youtube`, delete the test video
- Refresh the homepage
- Verify the video is removed

### 5. Test Dashboard Analytics
- Go to `/admin`
- Check the "YouTube Analytics" card
- Verify it shows correct counts

## Troubleshooting

### Issue: "Could not find the table 'public.youtube_videos'"
**Solution**: Run the migration SQL in Supabase SQL Editor

### Issue: Homepage shows no videos but admin panel has videos
**Solution**:
1. Check browser console for API errors
2. Verify `/api/youtube` returns data
3. Check RLS policies on `youtube_videos` table

### Issue: Can't add videos (Permission denied)
**Solution**:
1. Ensure you're logged in as admin
2. Check `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
3. Verify admin role in profiles table

### Issue: Videos show wrong titles
**Solution**: The system uses YouTube's oEmbed API to fetch actual titles. If this fails, it uses the manually entered title.

## Next Steps

### Optional Enhancements

1. **Add Edit Functionality**
   - Allow editing video title, description, and date
   - Implement in `/admin/youtube` with an edit modal

2. **Add Video Ordering**
   - Add `order` or `position` column to control display order
   - Add drag-and-drop reordering in admin

3. **Add Featured Flag**
   - Mark specific videos as "featured"
   - Show featured videos prominently on homepage

4. **Real YouTube Analytics**
   - Integrate YouTube Data API
   - Fetch real view counts, likes, comments
   - Display trending videos

5. **Bulk Import**
   - Import multiple videos from CSV
   - Or fetch from a YouTube playlist

## Files Modified

1. `app/components/RecentEventsSection.tsx` - Removed fallback data
2. `app/admin/youtube/page.tsx` - Enhanced with analytics
3. `app/admin/page.tsx` - Added YouTube analytics section
4. `app/api/youtube/route.ts` - (Already existed, no changes)
5. `supabase/schema.sql` - (Already had table definition)

## Files Created

1. `supabase/migrations/001_create_youtube_videos.sql` - Database migration
2. `scripts/migrate-youtube-videos.ts` - Migration script (alternative method)
3. `YOUTUBE_ADMIN_SETUP.md` - This documentation

## Summary

✅ **Complete Admin Control**: Admins can now fully manage YouTube videos that appear on the homepage
✅ **No More Hardcoded Data**: Homepage displays only database content
✅ **Real-time Updates**: Changes in admin panel immediately reflect on homepage
✅ **Analytics Dashboard**: YouTube video statistics visible in admin dashboard
✅ **Easy to Use**: Simple interface for adding/deleting videos

The YouTube admin system is now fully functional and integrated with the homepage!

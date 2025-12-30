# Events System Setup Guide

## Status: ✅ Code Ready, Awaiting Database Migration

Your events management system is **fully implemented** and ready to use! The admin interface and public pages are complete - you just need to run one SQL migration.

## What's Already Working

✅ **Admin Dashboard** (`/admin/events`)
- Full CRUD operations (Create, Read, Update, Delete)
- Real-time sync with database
- Event status management (draft/published/archived)
- Visibility control (public/private)
- Featured event highlighting
- Bulk actions and filtering

✅ **Public Events Page** (`/events`)
- Beautiful event listings
- Upcoming and past events sections
- Featured event showcase
- Event details modal
- Real-time updates
- Responsive design

✅ **API Endpoints** (`/api/events`)
- GET: Fetch events (with admin/public scope)
- POST: Create new events
- PUT: Update existing events
- PATCH: Partial updates (status, visibility, featured)
- DELETE: Remove events

## Quick Setup (5 minutes)

### Step 1: Run the SQL Migration

1. **Open Supabase SQL Editor**
   👉 https://supabase.com/dashboard/project/zsavekrhfwrpqudhjvlq/sql/new

2. **Copy the SQL from above** (or from `supabase/migrations/005_create_events_table.sql`)

3. **Paste and Run** - Click the "Run" button

4. **Verify Success** - You should see:
   - ✅ Table created
   - ✅ Indexes created
   - ✅ 3 sample events inserted

### Step 2: Test Your Events System

1. **Visit Admin Dashboard**
   ```
   http://localhost:3000/admin/events
   ```

   You should see:
   - Stats cards showing total/published/upcoming/past events
   - Event timeline table with 3 sample events
   - "Add Event" button

2. **Visit Public Events Page**
   ```
   http://localhost:3000/events
   ```

   You should see:
   - Featured event showcase
   - Upcoming events grid
   - Past events section
   - 3 sample events displayed

3. **Try Creating a New Event**
   - Click "Add Event" in admin dashboard
   - Fill out the form
   - Click "Create event"
   - Watch it appear in real-time!

## Sample Events Included

The migration includes 3 ready-to-use events:

1. **Africa Future Leaders Summit 2026**
   - Type: In-person summit
   - Location: Kigali, Rwanda
   - Status: Published & Featured
   - Date: July 15-17, 2026

2. **Talk100 Live: Innovation in African Tech**
   - Type: Virtual webinar
   - Status: Published
   - Date: December 20, 2025

3. **Project100 Scholarship Info Session**
   - Type: Virtual info session
   - Status: Published
   - Date: December 15, 2025

## Admin Features

### Creating Events
- **Required fields**: Title, Start Date
- **Optional fields**: Subtitle, Summary, Description, Location, Registration URL
- **Options**: Virtual event toggle, Featured toggle
- **Status**: Draft (hidden) → Published (visible) → Archived

### Managing Events
- **Quick Actions**: Publish/Unpublish, Show/Hide, Feature/Unfeature
- **Full Edit**: Click "Edit" to modify all event details
- **Delete**: Remove events permanently
- **Real-time Sync**: Changes appear instantly on public page

### Event Fields

| Field | Purpose | Example |
|-------|---------|---------|
| Title | Main event name | "Africa Future Leaders Summit 2026" |
| Subtitle | Supporting headline | "Shaping the Future of African Leadership" |
| Summary | Brief description (shows in cards) | "Join us for an immersive leadership summit..." |
| Description | Full details (shows in modal) | Detailed event information |
| Location | Physical venue | "Kigali Convention Centre" |
| City/Country | For filtering and display | "Kigali, Rwanda" |
| Virtual | Online event toggle | ✓ for virtual events |
| Start/End Date | Event schedule | "July 15-17, 2026" |
| Registration URL | Sign-up link | "/initiatives/summit" |
| Cover Image | Event photo | URL to image |
| Tags | Keywords | ["leadership", "networking"] |
| Capacity | Max attendees | 500 |
| Status | Visibility control | draft/published/archived |
| Featured | Homepage highlight | ✓ for main event |

## Public Page Features

### For Visitors
- **Featured Event**: Large hero card for highlighted event
- **Upcoming Events**: Grid of future events with registration
- **Past Events**: Archive of completed programs
- **Event Details**: Click any event for full information
- **Registration Links**: Direct sign-up from event cards

### Real-time Updates
- Events appear/disappear instantly when published/unpublished
- Changes to event details update immediately
- No page refresh needed

## Architecture

### Database Schema
```sql
Table: public.events
- id (uuid, primary key)
- slug (text, unique)
- title, subtitle, summary, description
- location, city, country, is_virtual
- start_at, end_at (timestamptz)
- registration_url, registration_label
- featured_image_url, gallery (jsonb)
- tags (text[]), capacity (integer)
- status (draft/published/archived)
- visibility (public/private)
- is_featured (boolean)
- metadata (jsonb)
- created_at, updated_at (timestamptz)
```

### API Routes
```typescript
GET    /api/events?scope=admin  // All events (admin only)
GET    /api/events              // Published public events
POST   /api/events              // Create event (admin only)
PUT    /api/events              // Update event (admin only)
PATCH  /api/events              // Partial update (admin only)
DELETE /api/events              // Delete event (admin only)
```

### Security
- **Row Level Security**: Enabled on events table
- **Public Access**: Only published + public events visible
- **Admin Access**: Service role can manage all events
- **Real-time**: Supabase realtime enabled for live updates

## Troubleshooting

### Events not showing on public page?
- Check event status is "published"
- Check visibility is "public"
- Check start_at date is set correctly

### Can't create events in admin?
- Verify you're logged in as admin
- Check browser console for errors
- Verify Supabase credentials in `.env.local`

### Migration already run?
The SQL uses `IF NOT EXISTS` clauses, so it's safe to run multiple times. If the table already exists, you'll see:
```
ℹ️ Events table already exists!
```

## Next Steps

After running the migration:

1. **Customize Sample Events**
   - Edit the 3 sample events with your actual event data
   - Update dates, locations, and descriptions
   - Add cover images

2. **Create Your Events**
   - Add your upcoming programs
   - Mark important events as featured
   - Keep draft events private until ready

3. **Share the Events Page**
   - Link to `/events` from your navigation
   - Promote upcoming events on social media
   - Use registration URLs to track signups

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify the migration ran successfully in Supabase
3. Ensure your `.env.local` has correct Supabase credentials
4. Check that you're logged in as an admin user

---

**Ready to go?** Run that SQL migration and your events system will be live! 🚀

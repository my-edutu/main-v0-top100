# Quick Start Guide - Admin Control System

This guide will help you set up and use the admin control system in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project created
- PostgreSQL database URL from Supabase

## Step 1: Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

Get these values from your Supabase dashboard:
- Project Settings → API → URL
- Project Settings → API → anon/public key
- Project Settings → API → service_role key (keep secret!)
- Project Settings → Database → Connection string

## Step 2: Run Database Migrations

```bash
# Make sure you're in the project directory
cd "C:\Users\USER\Desktop\top100\v0_Top100Afl - Copy"

# Run the setup script (on Windows, use Git Bash or WSL)
bash scripts/setup-admin-system.sh

# OR run migrations manually:
psql $DATABASE_URL < supabase/schema.sql
psql $DATABASE_URL < supabase/migrations/001_create_homepage_sections.sql
psql $DATABASE_URL < supabase/migrations/002_create_awardees_table.sql
```

## Step 3: Create Admin User

1. Start the development server:
```bash
npm run dev
```

2. Navigate to http://localhost:3000/auth/signup

3. Sign up with your email and password

4. Make yourself an admin by running this SQL query in Supabase SQL Editor:
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

## Step 4: Access Admin Dashboard

Visit http://localhost:3000/admin

You should now see the admin dashboard with these sections:
- Blog Management
- Awardees Management
- Events Management
- Homepage CMS
- User Management

## Step 5: Test Admin Features

### Create a Blog Post
1. Go to `/admin/blog`
2. Click "Add New Post"
3. Fill in title, content, tags
4. Upload a cover image (optional)
5. Toggle "Featured" to show on homepage
6. Click "Publish"

### Add an Awardee
1. Go to `/admin/awardees`
2. Click "Add New Awardee"
3. Fill in name, country, course, bio
4. Upload profile image
5. Toggle "Featured" to show on homepage
6. Click "Save"

### Create an Event
1. Go to `/admin/events`
2. Click "Create Event"
3. Fill in title, date, location
4. Add registration URL
5. Toggle "Featured" to show on homepage
6. Click "Publish"

### Manage Homepage Content
1. Go to `/admin/homepage`
2. View all homepage sections
3. Click edit icon to modify content
4. Use up/down arrows to reorder sections
5. Toggle eye icon to show/hide sections
6. Click "Save" to apply changes

## Common Admin Tasks

### Feature Content on Homepage

**Blog Posts:**
- Go to `/admin/blog`
- Find the post you want to feature
- Toggle the "Featured" switch ON
- Post will appear in homepage blog section

**Awardees:**
- Go to `/admin/awardees`
- Find the awardee to feature
- Click the "Feature" button (turns gold)
- Awardee appears in homepage featured section

**Events:**
- Go to `/admin/events`
- Toggle "Featured" switch
- Event appears in homepage events section

### Import Awardees from Excel

1. Go to `/admin/awardees`
2. Click "Import from Excel"
3. Select your Excel file (.xlsx or .xls)
4. File should have columns: name, email, country, course, bio, year
5. Click "Import"
6. Awardees will be added to the database

### Export Awardees to Excel

1. Go to `/admin/awardees`
2. Click "Download as Excel"
3. Excel file will download with all awardee data

### Delete Content

All admin pages have a delete button (trash icon) for each item:
- A confirmation dialog will appear
- Click "OK" to permanently delete
- This action cannot be undone

## Verification

Run the verification script to check everything is working:

```bash
# Make sure environment variables are set
export NEXT_PUBLIC_SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# Run verification
npx tsx scripts/verify-admin-system.ts
```

This will check:
- ✅ Database tables exist
- ✅ Admin users configured
- ✅ Featured content setup
- ✅ Homepage sections active

## API Endpoints Reference

### Posts
- `GET /api/posts?scope=admin` - All posts (admin only)
- `GET /api/posts?scope=homepage` - Featured posts (public)
- `POST /api/posts` - Create post (admin only)
- `PUT /api/posts` - Update post (admin only)
- `DELETE /api/posts` - Delete post (admin only)

### Awardees
- `GET /api/awardees` - All awardees (public)
- `POST /api/awardees` - Create awardee (admin only)
- `PUT /api/awardees` - Update awardee (admin only)
- `DELETE /api/awardees?id=uuid` - Delete awardee (admin only)

### Events
- `GET /api/events?scope=admin` - All events (admin only)
- `GET /api/events?scope=public` - Published events (public)
- `POST /api/events` - Create event (admin only)
- `PUT /api/events` - Update event (admin only)
- `DELETE /api/events` - Delete event (admin only)

### Homepage Sections
- `GET /api/homepage-sections?scope=admin` - All sections (admin only)
- `GET /api/homepage-sections?scope=public` - Active sections (public)
- `POST /api/homepage-sections` - Create section (admin only)
- `PUT /api/homepage-sections` - Update section (admin only)
- `DELETE /api/homepage-sections` - Delete section (admin only)

## Troubleshooting

### "Admin access required" error
**Cause:** Your user account doesn't have admin role
**Solution:** Run the SQL query to set role = 'admin' for your email

### "Failed to fetch" errors
**Cause:** Supabase connection issue or RLS policies
**Solution:**
1. Check environment variables are set correctly
2. Verify service role key is correct
3. Check Supabase dashboard for API errors

### Image upload failures
**Cause:** Storage bucket doesn't exist or permissions issue
**Solution:**
1. Go to Supabase Storage
2. Create buckets: `awardees`, `posts`, `events`
3. Set them to public access
4. Verify bucket policies allow uploads

### No featured content showing
**Cause:** Content not marked as featured or not published
**Solution:**
1. Go to admin dashboard
2. Find the content item
3. Toggle "Featured" switch ON
4. For posts/events, ensure status is "published"

## Support

For detailed documentation, see:
- `ADMIN_CONTROL_SYSTEM_IMPLEMENTATION.md` - Complete implementation details
- `ADMIN_SYSTEM_DOCUMENTATION.md` - Architecture and API reference

Need help? Check:
1. Console logs in browser DevTools (F12)
2. Supabase dashboard logs
3. Next.js server logs in terminal

## Next Steps

Now that your admin system is set up:

1. ✅ Add some blog posts
2. ✅ Import awardees from your Excel file
3. ✅ Create upcoming events
4. ✅ Customize homepage sections
5. ✅ Test featured content on homepage
6. ✅ Invite other admins (create accounts, set role = 'admin')

## Security Checklist

Before going to production:

- [ ] Change default admin password
- [ ] Rotate service role key
- [ ] Enable 2FA for admin accounts
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review RLS policies
- [ ] Test admin permissions thoroughly
- [ ] Set up monitoring and alerts

---

**Last Updated:** 2025-11-17
**Version:** 1.0.0

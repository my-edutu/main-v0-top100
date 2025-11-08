# Awardees System Setup Guide

Complete guide to set up the awardees system with 400+ profiles, visibility control, avatar, tagline, social links, and achievements.

---

## ✅ What's Been Configured

Your awardees system now includes:

- ✅ **418 Awardees** ready to import from Excel (`public/top100 Africa future Leaders 2025.xlsx`)
- ✅ **Enhanced Profile Fields**: avatar, tagline, headline, social links, achievements, interests
- ✅ **Visibility Control**: Show/hide individual profiles from public directory
- ✅ **Individual Profile Pages**: `/awardees/[slug]` for each awardee
- ✅ **Admin Management**: Full CRUD operations at `/admin/awardees`
- ✅ **Bulk Import/Export**: Excel file support

---

## 🚀 Setup Steps

### Step 1: Update Database Schema

You need to add new columns to your `awardees` table in Supabase.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard → **SQL Editor**
2. Copy the entire content from `supabase/update-awardees-schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute

**Option B: Using the Script**

```bash
node scripts/run-sql-migration.js
```

This will add the following columns to your `awardees` table:
- `avatar_url` (TEXT)
- `tagline` (TEXT)
- `headline` (TEXT)
- `social_links` (JSONB)
- `achievements` (JSONB)
- `is_public` (BOOLEAN, default TRUE)
- `interests` (TEXT[])

---

### Step 2: Import Awardees from Excel

Your Excel file is already in `public/top100 Africa future Leaders 2025.xlsx` with **418 awardees**.

**Option A: Via Admin Interface (Recommended)**

1. Start your development server: `npm run dev`
2. Go to [http://localhost:3000/admin/awardees](http://localhost:3000/admin/awardees)
3. Click **"Select Excel File"** in the right sidebar
4. Choose the file (or it will auto-load from `public/` folder)
5. Click **"Import"**
6. Wait for success message

**Option B: Via API**

```bash
curl -X POST http://localhost:3000/api/awardees/import \
  -H "Content-Type: multipart/form-data" \
  -F "file=@public/top100 Africa future Leaders 2025.xlsx"
```

---

### Step 3: Verify Import

1. Go to [http://localhost:3000/admin/awardees](http://localhost:3000/admin/awardees)
2. You should see **418 awardees** listed
3. Check the stats at the top of the page

---

## 🎯 Features Overview

### Admin Features (`/admin/awardees`)

#### 1. **Visibility Control**
- Each awardee has a **Visibility** column with Eye/EyeOff icon
- Click to toggle between **Visible** (public) and **Hidden** (admin-only)
- Hidden profiles won't appear on `/awardees` public directory

#### 2. **Bulk Operations**
- **Import**: Upload Excel files with awardee data
- **Export**: Download current awardees as Excel
- **Template**: Download the original template file

#### 3. **Individual Management**
- **Edit**: Modify profile details, add avatar, social links, achievements
- **Delete**: Remove awardee (with confirmation)
- **Add New**: Create individual profiles manually

#### 4. **Search & Filter**
- Search by name, country, course, or bio
- Real-time filtering

---

### Public Features

#### `/awardees` - Directory
- Grid of all **visible** awardees (is_public = TRUE)
- Country flags, avatars, names, taglines
- Click any card to view full profile

#### `/awardees/[slug]` - Individual Profile
Displays:
- **Header**: Avatar, name, tagline, headline, cohort badge
- **Details**: Location, school, field of study, CGPA, year
- **Biography**: Full "About" text from Excel
- **Focus Areas**: Interests/tags
- **Achievements**: Awards, recognitions (if added)
- **Gallery**: Photos (if added)
- **Social Links**: LinkedIn, Twitter, Instagram, Facebook, Website
- **Contact**: Email addresses

---

## 📊 Excel File Structure

Your Excel file (`top100 Africa future Leaders 2025.xlsx`) contains:

**Current Columns:**
- `Name` → Required
- `E-mail` → Email address
- `Country` → Location (auto-cleans "NG Nigeria" → "Nigeria")
- `CGPA` → Academic grade (e.g., "4.70 / 5.00")
- `Department` → Course/Program
- `About` → Biography/Description

**Optional Columns** (will be auto-mapped if present):
- `avatar` / `avatar_url` / `image` / `photo`
- `tagline` / `title` / `position`
- `headline` / `summary`
- `linkedin` / `twitter` / `instagram` / `facebook` / `website`

---

## 🔧 Customization

### Adding Social Links to Profiles

1. Go to `/admin/awardees`
2. Click **Edit** on any awardee
3. Add social media URLs (if edit form supports it)

Or update via API:

```javascript
fetch('/api/awardees', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'awardee-id',
    social_links: {
      linkedin: 'https://linkedin.com/in/username',
      twitter: 'https://twitter.com/username',
      instagram: 'https://instagram.com/username'
    }
  })
})
```

### Adding Achievements

```javascript
fetch('/api/awardees', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'awardee-id',
    achievements: [
      {
        id: '1',
        title: 'Best Graduating Student',
        organization: 'University Name',
        recognition_date: '2024',
        description: 'Top of class with 5.0 CGPA',
        link: 'https://...'
      }
    ]
  })
})
```

---

## 🎨 Profile Page Features

Each profile at `/awardees/[slug]` includes:

### ✅ Implemented
- ✅ Cover image (if `cover_image_url` exists)
- ✅ Avatar with fallback SVG
- ✅ Name, tagline, headline display
- ✅ Cohort badge (e.g., "Top100 Africa Future Leader 2024")
- ✅ Location with flag emoji
- ✅ School, field of study, CGPA, year
- ✅ Full biography with line breaks
- ✅ Focus areas (interests) as badges
- ✅ Achievements section with links
- ✅ Gallery grid (if images added)
- ✅ Social connect buttons
- ✅ Email contact links
- ✅ Mentor information
- ✅ Last updated timestamp

### 📝 To Customize
- Add upload UI for avatar images in edit form
- Add achievements management in edit form
- Add interests/tags selector in edit form

---

## 🔍 Troubleshooting

### Issue: "Columns do not exist"
**Solution**: Run the SQL migration (Step 1)

### Issue: "No awardees imported"
**Solution**: Check that:
1. Excel file is in `public/` folder
2. You're logged in as admin
3. File has correct format (see structure above)

### Issue: "Profile not found"
**Solution**: Check that `is_public` is `TRUE` for that awardee

### Issue: "Visibility toggle not working"
**Solution**: Ensure you've run the database migration to add `is_public` column

---

## 📚 API Reference

### GET `/api/awardees`
Fetch all awardees (admin sees all, public sees only `is_public=true`)

### POST `/api/awardees`
Create new awardee (admin only)

### PUT `/api/awardees`
Update awardee (admin only)
- Supports partial updates
- Can update `is_public` field

### DELETE `/api/awardees?id={id}`
Delete awardee (admin only)

### POST `/api/awardees/import`
Bulk import from Excel (admin only)

### GET `/api/awardees/export`
Export to Excel (admin only)

---

## ✨ Next Steps

1. **Run the database migration** (Step 1)
2. **Import the 418 awardees** (Step 2)
3. **Test visibility toggle** on a few profiles
4. **Customize profiles** by adding avatars, achievements, social links
5. **Hide test profiles** using visibility control
6. **Share public directory** at `/awardees`

---

## 🎉 Success Checklist

- [ ] Database schema updated
- [ ] 418 awardees imported successfully
- [ ] Visibility toggle working in admin
- [ ] Individual profiles accessible at `/awardees/[slug]`
- [ ] Public directory shows only visible profiles
- [ ] Admin can edit profiles
- [ ] Excel import/export working

---

**Need Help?** Check the console logs or contact support.

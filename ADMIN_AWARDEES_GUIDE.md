# Admin Awardees Management Guide

## 🎯 What Has Been Fixed

### ✅ Immediate Fixes Completed

1. **Featured Field in API** - Fixed missing `featured` field in PUT handler
   - You can now toggle featured status in admin and it saves to database
   - Star button works correctly now

2. **Real-time Homepage Updates** - Converted homepage to real-time
   - Featured awardees now update automatically on homepage
   - No page refresh needed - changes appear instantly
   - Uses Supabase real-time subscriptions

3. **Next.js Revalidation** - Added cache invalidation
   - All admin changes trigger page revalidation
   - Homepage, awardees page, and profile pages refresh automatically
   - Faster updates across the entire site

4. **Database Schema Verified** - All required fields exist
   - `featured` column exists and indexed
   - `is_public` column exists and indexed
   - RLS policies configured correctly
   - Real-time publications enabled

## 🚀 How to Use the Admin Panel

### Accessing Admin Panel
1. Navigate to `/admin/awardees`
2. You'll see a comprehensive dashboard with:
   - **Stats cards** showing total awardees, countries, courses, etc.
   - **Main table** listing all awardees
   - **Import/Export panel** for Excel files

### Understanding the Table Columns

#### 1. **Image**
- Shows awardee's profile picture
- Gray placeholder if no image uploaded

#### 2. **Name**
- Full name of the awardee
- Click to edit

#### 3. **Country**
- Displayed as a badge
- Filterable via search

#### 4. **Course**
- Field of study or institution

#### 5. **Year**
- Cohort year (e.g., 2024, 2025)

#### 6. **Featured** ⭐ (Star Button)
- **Purpose:** Controls if awardee appears on homepage
- **Yellow/Filled Star** = Featured on homepage
- **Outline Star** = Not featured
- **Click to toggle** featured status
- Changes save immediately and appear on homepage in real-time

#### 7. **Visibility** 👁️ (Eye Button)
- **Purpose:** Controls if awardee appears on /awardees page
- **Green "Visible"** = Profile is public (shows on /awardees)
- **Gray "Hidden"** = Profile is hidden (admin-only view)
- **Click to toggle** visibility status
- Useful for draft profiles or hiding specific awardees temporarily

#### 8. **Actions**
- **Edit button** (pencil icon) - Opens edit form
- **Delete button** (trash icon) - Removes awardee (with confirmation)

### Search Functionality
The search bar filters by:
- Name
- Country
- Course/Field of study
- Bio content

## 📊 Stats Dashboard

The top cards show:
1. **Total** - Total number of awardees in database
2. **Countries** - Number of unique countries represented
3. **Courses** - Number of unique fields of study
4. **[Current Year]** - Awardees from current year
5. **Recent** - Awardees from current and last year

These stats update automatically when you add/edit/delete awardees.

## ⭐ Managing Featured Awardees (Homepage)

### How to Feature an Awardee
1. Find the awardee in the table
2. Click the **Star button** in the "Featured" column
3. The star will turn yellow/filled
4. **The awardee now appears on the homepage immediately**

### How to Unfeature an Awardee
1. Find the featured awardee (yellow star)
2. Click the **Star button** again
3. The star becomes an outline
4. **The awardee is removed from homepage immediately**

### How Many Can Be Featured?
- No limit! Feature as many as you want
- However, for best UX, recommend 5-10 featured awardees
- Featured awardees appear in the "Meet the Bold Minds" section on homepage

### Where Do Featured Awardees Appear?
- Homepage section: "Meet the Bold Minds Shaping Africa Tomorrow"
- They display in a horizontal scrollable card layout
- Shows: Name, Country, CGPA, Avatar, and Bio (on hover)

## 👁️ Managing Visibility (Public/Hidden)

### Public vs Hidden
- **Public** (Eye icon, green) - Appears on `/awardees` directory page
- **Hidden** (Eye-off icon, gray) - Only visible to admins

### Use Cases for Hidden Profiles
1. **Draft profiles** - Working on profile before publishing
2. **Incomplete data** - Waiting for information
3. **Temporary removal** - Need to hide temporarily without deleting
4. **Review process** - Profile under review

### How to Hide an Awardee
1. Click the **Eye button** (green "Visible")
2. Changes to **Eye-off button** (gray "Hidden")
3. **Awardee no longer appears on `/awardees` page**
4. Admin can still see and edit in admin panel

### How to Make an Awardee Public
1. Click the **Eye-off button** (gray "Hidden")
2. Changes to **Eye button** (green "Visible")
3. **Awardee now appears on `/awardees` page**

## ➕ Adding New Awardees

### Method 1: Manual Entry
1. Click **"Add New Awardee"** button
2. Fill in the form:
   - Name (required)
   - Email
   - Country
   - CGPA
   - Course/Field of study
   - Bio
   - Year
   - Upload image (optional)
3. Click **Save**
4. Awardee appears in table immediately

### Method 2: Excel Import (Bulk Upload)
1. Click **"Select Excel File"** in the Import/Export panel
2. Choose your `.xlsx` or `.xls` file
3. Click **"Import"**
4. System processes the file and imports all rows
5. Shows success message with number imported
6. Table refreshes automatically with new awardees

#### Excel File Format
Your Excel file should have these columns:
- `Name` or `Full Name` (required)
- `Email`
- `Country` or `Nationality`
- `CGPA` or `GPA`
- `Course` or `Program` or `Department`
- `Bio` or `Description` or `Leadership`
- `Year` or `Batch`
- `Featured` (optional: "true", "yes", "1", or "featured" for featured awardees)

**Download Template:**
Click "Download Template" button to get a pre-formatted Excel file.

## ✏️ Editing Awardees

1. Click the **Edit button** (pencil icon) in Actions column
2. Edit form opens with current data
3. Make your changes
4. Click **Save**
5. Changes save immediately
6. If awardee is featured, homepage updates automatically
7. If visibility changes, `/awardees` page updates automatically

## 🗑️ Deleting Awardees

1. Click the **Delete button** (trash icon) in Actions column
2. Confirm deletion in popup dialog
3. Awardee is permanently removed from database
4. Table refreshes automatically
5. If awardee was featured, homepage updates
6. Stats recalculate automatically

**⚠️ Warning:** Deletion is permanent and cannot be undone!

## 📥 Exporting Data

### Export All Awardees to Excel
1. Click **"Download as Excel"** button
2. Browser downloads `.xlsx` file
3. File contains all awardees with all fields
4. Use for backups, reporting, or external analysis

## 🔄 Real-time Updates

### What Updates in Real-time?

#### Admin Panel
- ✅ Table refreshes when awardees change
- ✅ Stats recalculate automatically
- ✅ Search results update live
- ✅ Works across multiple admin sessions

#### Homepage (/)
- ✅ Featured awardees section updates immediately
- ✅ No page refresh needed
- ✅ Changes visible to all visitors instantly

#### Awardees Page (/awardees)
- ✅ Directory updates when awardees added/edited
- ✅ Visibility changes apply immediately
- ✅ New awardees appear automatically

### How Fast Are Updates?
- **Admin changes**: Immediate (< 1 second)
- **Database sync**: Real-time via Supabase
- **Homepage updates**: Instant (real-time subscription)
- **Page revalidation**: < 2 seconds

## 🧪 Testing Your Changes

### Test Checklist

#### ✅ Featured Toggle
1. Go to admin panel
2. Click star on an awardee
3. Open homepage in another tab
4. Verify awardee appears in "Bold Minds" section
5. Click star again to unfeature
6. Verify awardee disappears from homepage

#### ✅ Visibility Toggle
1. Go to admin panel
2. Click eye on an awardee to hide
3. Open `/awardees` page in another tab
4. Verify awardee is not listed
5. Click eye again to show
6. Verify awardee reappears

#### ✅ Add New Awardee
1. Click "Add New Awardee"
2. Fill in details
3. Save
4. Verify appears in admin table
5. Check stats updated
6. Toggle featured/visibility

#### ✅ Excel Import
1. Download template
2. Add 5-10 test entries
3. Import file
4. Verify all imported correctly
5. Check for any error messages

#### ✅ Edit Awardee
1. Click edit on any awardee
2. Change name, country, bio
3. Save changes
4. Verify changes reflected in table
5. Check individual profile page updated

## 🐛 Troubleshooting

### Issue: Featured awardees not showing on homepage
**Solution:**
1. Check awardee has `featured = true` (yellow star in admin)
2. Check awardee has `is_public = true` (green eye in admin)
3. Clear browser cache and refresh homepage
4. Check browser console for errors
5. Verify Supabase connection

### Issue: Can't see all 400+ awardees
**Possible causes:**
1. Check search bar is empty (it filters results)
2. Scroll through pagination if implemented
3. Check API endpoint returns data: `/api/awardees`
4. Verify you're logged in as admin
5. Check browser console for errors

### Issue: Changes not saving
**Solution:**
1. Check you're logged in as admin
2. Verify internet connection
3. Check browser console for API errors
4. Ensure Supabase connection is active
5. Try refreshing the page and trying again

### Issue: Excel import fails
**Solution:**
1. Verify file is `.xlsx` or `.xls` format
2. Check file has correct column names
3. Ensure no special characters in names
4. Try template file first to test
5. Check error message for specific issue

### Issue: Real-time updates not working
**Solution:**
1. Check Supabase real-time is enabled
2. Verify browser supports WebSockets
3. Check no ad blockers blocking connections
4. Refresh page to re-establish connection
5. Check Supabase dashboard for connection status

## 📋 Best Practices

### Managing Featured Awardees
- ✅ Feature 5-10 awardees for optimal homepage display
- ✅ Rotate featured awardees monthly or quarterly
- ✅ Feature diverse representation (countries, fields, years)
- ✅ Ensure featured awardees have complete profiles
- ✅ Verify images are high quality before featuring

### Managing Visibility
- ✅ Use "Hidden" for draft/incomplete profiles
- ✅ Keep featured awardees as "Visible"
- ✅ Review hidden profiles monthly
- ✅ Communicate with awardees before hiding profiles
- ✅ Document reason for hiding (internal notes)

### Data Quality
- ✅ Ensure all awardees have complete bios
- ✅ Verify country names are consistent
- ✅ Use standard course/field names
- ✅ Upload high-quality profile images
- ✅ Double-check CGPA and year data

### Performance
- ✅ Limit featured awardees to 10-15 max
- ✅ Regular Excel exports as backups
- ✅ Archive old cohorts if needed
- ✅ Monitor page load times with many awardees

## 🔐 Security Notes

### Admin Access
- Only users with `role = 'admin'` can access admin panel
- All API endpoints check admin authentication
- RLS policies prevent unauthorized access
- Service role used for admin operations

### Data Protection
- All changes logged with timestamps
- Can trace who made changes via session data
- Deleted data is permanent (no soft delete yet)
- Regular backups recommended

## 📞 Need Help?

If you encounter issues:
1. Check this guide first
2. Review `DATABASE_SCHEMA_VERIFICATION.md` for technical details
3. Check browser console for error messages
4. Verify Supabase dashboard shows correct data
5. Contact development team with specific error details

## 🎯 Quick Reference

| Action | Button | Result |
|--------|--------|--------|
| Feature on homepage | ⭐ Star (outline) | Yellow star, appears on homepage |
| Unfeature from homepage | ⭐ Star (filled) | Outline star, removed from homepage |
| Show on /awardees | 👁️ Eye-off (Hidden) | Green eye, visible to public |
| Hide from /awardees | 👁️ Eye (Visible) | Gray eye-off, admin-only |
| Edit awardee | ✏️ Pencil | Opens edit form |
| Delete awardee | 🗑️ Trash | Removes permanently |
| Add new | ➕ Add New Awardee | Opens creation form |
| Import bulk | 📤 Upload | Imports from Excel |
| Export data | 📥 Download | Exports to Excel |

---

**Last Updated:** November 2024
**Version:** 2.0 - Real-time Sync Enabled

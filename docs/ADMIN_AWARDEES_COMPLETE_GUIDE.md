# Complete Admin Awardees Management Guide

## Overview
The admin awardees system now has **FULL CONTROL** over all awardees including the 400+ from your Excel file. This guide covers all features and how to use them.

## 🎯 Key Features Implemented

### 1. **Complete Dashboard Statistics**
- **Total Awardees**: Shows all awardees in the database
- **Countries**: Number of unique countries represented
- **Courses**: Number of unique fields of study
- **Current Year**: Awardees from this year
- **Recent**: Awardees from this year and last year
- **Featured**: ⭐ Awardees displayed on homepage (clickable to filter)

### 2. **Advanced Filtering**
Filter awardees by clicking these buttons:
- **All**: View all awardees (default)
- **Featured**: Only awardees marked for homepage display
- **Visible**: Only public awardees
- **Hidden**: Only hidden awardees

### 3. **Bulk Operations**
Select multiple awardees using checkboxes and perform:
- **Feature All**: Add selected awardees to homepage
- **Unfeature All**: Remove from homepage
- **Show All**: Make selected awardees visible
- **Hide All**: Hide selected awardees from public view
- **Delete All**: Permanently delete selected awardees

### 4. **Individual Controls**
For each awardee, you can:
- ⭐ **Feature/Unfeature**: Toggle homepage appearance
- 👁️ **Show/Hide**: Toggle public visibility
- ✏️ **Edit**: Update all details
- 🗑️ **Delete**: Remove permanently

### 5. **Import/Export System**
- **Import**: Upload Excel file to bulk import/update awardees
- **Export**: Download complete database as Excel with all fields
- **Template**: Download sample Excel format

---

## 📋 How to Import Your 400+ Awardees

### Step 1: Access Admin Panel
```
Navigate to: /admin/awardees
```

### Step 2: Import Excel File
1. Look for the **"Excel Import/Export"** card on the right side
2. Click **"Select Excel File"** button
3. Choose your `top100 Africa future Leaders 2025.xlsx` file
4. Click **"Import"** button
5. Wait for success message

**The system will:**
- Import all 400+ awardees
- Automatically create slugs from names
- Handle duplicate entries (updates existing ones)
- Parse all fields including social links, interests, etc.

### Step 3: Verify Import
- Check the **Total** stat card - should show 400+
- Use search to find specific awardees
- Filter by different criteria

---

## 🌟 Managing Featured Awardees (Homepage)

### To Feature 5 Awardees for Homepage:

#### Method 1: Individual Selection
1. Find the awardee using search
2. Click the **"Feature"** button (turns gold when featured)
3. Repeat for 5 awardees
4. Check the **Featured** stat - should show "5"

#### Method 2: Bulk Selection
1. Click filter **"All"** to see everyone
2. Check the boxes next to 5 awardees you want to feature
3. Click **"Feature All"** in the bulk actions bar
4. Check homepage to verify they appear

### To View Only Featured Awardees:
1. Click the **Featured** stat card (gold/orange)
2. OR click the **"Featured (5)"** filter button
3. Only featured awardees will display

---

## 🔍 Search & Filter Workflow

### Find Specific Awardees:
```
1. Use search box: "Search awardees..."
2. Search by: name, country, course, or bio
3. Results update in real-time
```

### Filter by Status:
- **All (400+)**: Every awardee in database
- **Featured (5)**: Homepage awardees
- **Visible (395)**: Public profiles
- **Hidden (5)**: Private/draft profiles

### Combine Search + Filter:
1. Select filter (e.g., "Featured")
2. Then search within filtered results
3. Great for finding specific featured awardees

---

## ✏️ Editing Awardees

### Edit Single Awardee:
1. Find the awardee (search or filter)
2. Click **Edit** button (pencil icon)
3. Update fields:
   - Name, Email, Country
   - Course, CGPA, Bio
   - Year, Image URL
   - Avatar, Tagline, Headline
   - Social Links (LinkedIn, Twitter, etc.)
   - Interests, Achievements
   - Featured status
   - Visibility (is_public)
4. Click **Save**

### Bulk Edit (Feature/Visibility):
1. Select multiple awardees (checkboxes)
2. Use bulk action buttons
3. Changes apply to all selected

---

## 📊 Export & Backup

### Download Complete Database:
1. Go to **"Excel Import/Export"** card
2. Click **"Download as Excel"**
3. Saves as: `awardees-export-YYYY-MM-DD.xlsx`

### Export Includes:
- All awardee data (400+ rows)
- All fields: ID, Name, Slug, Email, Country, CGPA, Course, Bio, Year
- Images: Image URL, Avatar URL
- Content: Tagline, Headline, Bio
- Status: Featured (Yes/No), Visible (Yes/No)
- Social: LinkedIn, Twitter, Instagram, Facebook, Website
- Meta: Interests, Profile ID, Created/Updated timestamps

### Use Cases:
- **Backup**: Regular database backups
- **Analysis**: Import into Excel for analysis
- **Migration**: Move data to other systems
- **Verification**: Check which awardees are featured/visible

---

## 🛠️ Common Admin Tasks

### Task 1: Import 400+ Awardees
```
1. Go to /admin/awardees
2. Click "Select Excel File" in right panel
3. Choose your Excel file
4. Click "Import"
5. Wait for "Imported 400+ awardees successfully"
6. Verify Total stat shows correct count
```

### Task 2: Feature 5 Awardees for Homepage
```
1. Search for first awardee
2. Click "Feature" button (turns gold)
3. Repeat for 4 more awardees
4. Click "Featured" filter to view all 5
5. Visit homepage to verify they appear
```

### Task 3: Hide Draft Awardees
```
1. Search for awardee
2. Click "Visible" button to hide
3. Button changes to "Hidden" (red)
4. Awardee won't appear on public /awardees page
5. Still editable in admin panel
```

### Task 4: Bulk Delete Test Entries
```
1. Search for test entries (e.g., "test")
2. Check boxes next to all test awardees
3. Click "Delete All" in bulk actions
4. Confirm deletion
5. Test entries removed
```

### Task 5: Export for Backup
```
1. Click "Download as Excel" in right panel
2. File downloads with timestamp
3. Store safely for backup
4. Can re-import if needed
```

---

## 📈 Understanding Statistics

### Total Awardees (Blue Card)
- **Count**: All awardees in database
- **After Import**: Should show 400+
- **Includes**: Featured, visible, and hidden

### Countries (Green Card)
- **Count**: Unique countries represented
- **Example**: 54 countries across Africa

### Courses (Purple Card)
- **Count**: Unique fields of study
- **Example**: Engineering, Medicine, Business, etc.

### Current Year (Amber Card)
- **Count**: Awardees from 2025
- **Updates**: Automatically based on year field

### Recent (Emerald Card)
- **Count**: This year + last year
- **Logic**: Current year OR (last year if within 3 months)

### Featured (Gold Card) ⭐
- **Count**: Awardees on homepage
- **Target**: Usually 5-10 featured
- **Clickable**: Click to filter featured awardees

---

## 🔐 Security & Permissions

### Admin-Only Access
- All awardee management requires admin role
- Import/Export requires authentication
- Bulk operations are admin-only

### Public vs Private
- **Visible (is_public = true)**: Appears on /awardees page
- **Hidden (is_public = false)**: Only visible in admin panel
- **Featured**: Subset of visible awardees on homepage

---

## 🚀 Real-Time Updates

### Live Sync
The admin panel automatically updates when:
- You make changes (feature, hide, delete)
- Another admin makes changes
- Bulk operations complete
- Imports finish

### No Refresh Needed
- Stats update automatically
- Table updates in real-time
- Filters apply instantly

---

## 📝 Best Practices

### 1. Regular Backups
- Export database monthly
- Store exports safely
- Keep version history

### 2. Featured Awardees
- Feature 5-10 diverse awardees
- Rotate featured awardees quarterly
- Represent different countries/fields

### 3. Data Quality
- Verify all imports
- Check for duplicates
- Update bio/images regularly

### 4. Visibility Management
- Keep draft profiles hidden
- Make complete profiles visible
- Review hidden profiles monthly

---

## 🐛 Troubleshooting

### Problem: Import shows 0 awardees
**Solution**:
- Check Excel file format (must be .xlsx or .xls)
- Ensure file has data in first sheet
- Verify column names match expected format

### Problem: Featured awardees not on homepage
**Solution**:
- Check Featured filter shows 5 awardees
- Verify `featured = true` in database
- Ensure awardees are also visible (is_public = true)
- Check homepage component fetches from awardee_directory view

### Problem: Can't see total count
**Solution**:
- Refresh the page
- Check if import completed successfully
- Verify database connection

### Problem: Bulk operations fail
**Solution**:
- Try selecting fewer awardees at once
- Check network connection
- Verify admin permissions

---

## 📱 API Endpoints Reference

### GET /api/awardees
- Fetch all awardees
- Returns: Array of awardee objects
- Auto-initializes from Excel if database empty

### POST /api/awardees
- Create new awardee
- Requires: name (minimum)
- Supports: FormData (with image) or JSON

### PUT /api/awardees
- Update awardee
- Requires: id
- Updates: Any field (name, featured, is_public, etc.)

### DELETE /api/awardees?id={id}
- Delete awardee
- Requires: id parameter
- Permanent deletion

### POST /api/awardees/import
- Bulk import from Excel
- Accepts: FormData with file
- Upserts: Updates existing, creates new

### GET /api/awardees/export
- Export all awardees
- Returns: Excel file
- Includes: All fields with proper formatting

---

## ✅ Verification Checklist

After importing 400+ awardees:

- [ ] Total stat shows 400+
- [ ] Can search and find specific awardees
- [ ] All filters work (All, Featured, Visible, Hidden)
- [ ] Can feature/unfeature awardees
- [ ] Can show/hide awardees
- [ ] Can edit awardee details
- [ ] Can delete awardees
- [ ] Bulk operations work
- [ ] Export downloads Excel file
- [ ] Featured awardees appear on homepage
- [ ] Public awardees appear on /awardees page

---

## 🎓 Summary

You now have **COMPLETE CONTROL** over all awardees:

✅ **Import**: Bulk import 400+ from Excel
✅ **View**: Dashboard with comprehensive stats
✅ **Filter**: Advanced filtering (featured, visible, hidden)
✅ **Search**: Real-time search across all fields
✅ **Feature**: Mark awardees for homepage display
✅ **Visibility**: Show/hide from public view
✅ **Edit**: Update all awardee details
✅ **Delete**: Remove awardees permanently
✅ **Bulk**: Select multiple for batch operations
✅ **Export**: Download complete database

The system is production-ready and scales to handle thousands of awardees efficiently!

---

## 📞 Need Help?

If you encounter any issues:
1. Check this guide first
2. Verify admin permissions
3. Check browser console for errors
4. Review API responses in Network tab

The admin panel at `/admin/awardees` is your complete control center for managing all Africa Future Leaders awardees! 🌍

# Setup Verification & Testing Guide

## 🎯 Quick Start Testing

Follow these steps to verify that the admin-frontend sync is working correctly.

## 1️⃣ Verify Database Schema

### Check if Required Columns Exist

Run this query in your Supabase SQL Editor:

```sql
-- Check awardees table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'awardees'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Expected columns:**
- ✅ `id` (uuid)
- ✅ `name` (text)
- ✅ `slug` (text)
- ✅ `featured` (boolean) - **CRITICAL**
- ✅ `is_public` (boolean) - **CRITICAL**
- ✅ `country` (text)
- ✅ `course` (text)
- ✅ `bio` (text)
- ✅ `cgpa` (text)
- ✅ `year` (integer)
- ✅ `avatar_url` (text)
- ✅ Other fields...

### Check Indexes

```sql
-- Check indexes on critical fields
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'awardees'
  AND schemaname = 'public';
```

**Expected indexes:**
- ✅ `awardees_featured_idx`
- ✅ `awardees_is_public_idx`

### Check View Exists

```sql
-- Verify awardee_directory view exists
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'awardee_directory';
```

Should return: `awardee_directory`

### Check Real-time is Enabled

```sql
-- Check if awardees table is in realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Should include: `awardees` table

## 2️⃣ Test Admin Panel

### Access Admin Panel
1. Navigate to: `http://localhost:3000/admin/awardees` (or your domain)
2. Log in if prompted
3. Verify you see the admin dashboard

### Check Admin Access
If you get "Access Denied":

```sql
-- Check your user's role
SELECT id, email, role
FROM public.profiles
WHERE email = 'your-email@example.com';

-- If role is NULL or 'user', update it:
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Verify Stats Display
The dashboard should show:
- ✅ Total awardees count
- ✅ Number of countries
- ✅ Number of courses
- ✅ Current year count
- ✅ Recent awardees count

### Check Table Renders
- ✅ Table shows all awardees
- ✅ Columns: Image, Name, Country, Course, Year, Featured, Visibility, Actions
- ✅ Search bar is functional
- ✅ Pagination works (if > 30 awardees)

## 3️⃣ Test Featured Toggle

### Manual Test
1. **In Admin Panel:**
   - Find any awardee (preferably one with a good profile)
   - Note if star is filled (featured) or outline (not featured)
   - Click the **Star button**
   - Star should change state immediately
   - Success toast appears

2. **In Database:**
   ```sql
   -- Check featured status in database
   SELECT name, featured, is_public
   FROM public.awardees
   WHERE name = 'Test Awardee Name';
   ```
   - `featured` should match the star state in admin

3. **On Homepage:**
   - Open homepage: `http://localhost:3000/` in another tab
   - Scroll to "Meet the Bold Minds Shaping Africa Tomorrow" section
   - If featured = true, awardee should appear
   - If featured = false, awardee should NOT appear
   - **Changes should appear within 1-2 seconds (real-time)**

### Automated Test Script

Create a test file: `test-featured-sync.js`

```javascript
// Run with: node test-featured-sync.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFeaturedSync() {
  console.log('🧪 Testing Featured Awardee Sync...\n');

  // 1. Get first awardee
  const { data: awardee, error } = await supabase
    .from('awardees')
    .select('id, name, featured')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error fetching awardee:', error);
    return;
  }

  console.log(`📝 Testing with: ${awardee.name}`);
  console.log(`   Current featured status: ${awardee.featured}\n`);

  // 2. Toggle featured status
  const newFeatured = !awardee.featured;
  console.log(`🔄 Setting featured to: ${newFeatured}...`);

  const { error: updateError } = await supabase
    .from('awardees')
    .update({ featured: newFeatured })
    .eq('id', awardee.id);

  if (updateError) {
    console.error('❌ Error updating:', updateError);
    return;
  }

  console.log('✅ Update successful!\n');

  // 3. Verify change
  await new Promise(resolve => setTimeout(resolve, 500));

  const { data: updated } = await supabase
    .from('awardees')
    .select('featured')
    .eq('id', awardee.id)
    .single();

  console.log(`✨ Verified featured status: ${updated.featured}\n`);

  if (updated.featured === newFeatured) {
    console.log('✅ TEST PASSED: Featured status synced correctly!');
  } else {
    console.log('❌ TEST FAILED: Featured status did not sync!');
  }

  // 4. Check homepage would show this
  const { data: featuredList, error: listError } = await supabase
    .from('awardee_directory')
    .select('name')
    .eq('featured', true);

  console.log(`\n📊 Currently featured awardees: ${featuredList?.length || 0}`);
  if (newFeatured) {
    console.log(`   Should include: ${awardee.name}`);
  }
}

testFeaturedSync().catch(console.error);
```

Run test:
```bash
node test-featured-sync.js
```

## 4️⃣ Test Visibility Toggle

### Manual Test
1. **In Admin Panel:**
   - Find any awardee
   - Note if eye is green (visible) or gray (hidden)
   - Click the **Eye button**
   - Button should change state immediately
   - Success toast appears

2. **In Database:**
   ```sql
   -- Check visibility in database
   SELECT name, is_public
   FROM public.awardees
   WHERE name = 'Test Awardee Name';
   ```
   - `is_public` should match the eye state in admin

3. **On Awardees Page:**
   - Open `/awardees` page in another tab
   - If `is_public = true`, awardee should appear in directory
   - If `is_public = false`, awardee should NOT appear
   - **Changes should appear within 1-2 seconds (real-time)**

## 5️⃣ Test Real-time Updates

### Test Setup
1. Open admin panel in Browser Tab 1
2. Open homepage in Browser Tab 2
3. Open browser console in Tab 2 (F12)

### Test Procedure
1. **In Tab 1 (Admin):**
   - Click star to feature an awardee

2. **In Tab 2 (Homepage):**
   - Watch console logs: Should see "Awardees table changed, refreshing featured awardees"
   - Featured section should update automatically (no refresh needed)
   - New awardee should appear within 1-2 seconds

3. **Repeat for unfeaturing:**
   - Click star again in admin
   - Homepage should remove awardee automatically

### Expected Console Output

In homepage console, you should see:
```
Awardees table changed, refreshing featured awardees: {
  eventType: "UPDATE",
  new: { id: "...", featured: true, ... },
  old: { id: "...", featured: false, ... }
}
```

## 6️⃣ Test Excel Import/Export

### Export Test
1. **In Admin Panel:**
   - Click "Download as Excel" button
   - File should download immediately
   - Open file in Excel/Sheets

2. **Verify Export:**
   - Check all awardees are included
   - Verify all columns present
   - Check data is accurate

### Import Test
1. **Prepare Test File:**
   - Download template or use exported file
   - Add 3-5 test entries:
     - Give unique names (e.g., "Test Awardee 1")
     - Fill in country, course, bio
     - Set one as featured: "featured" = "true"

2. **Import:**
   - Click "Select Excel File"
   - Choose your test file
   - Click "Import"
   - Watch for success message

3. **Verify Import:**
   - Check admin table shows new entries
   - Verify stats updated (total count increased)
   - Check featured awardee appears on homepage
   - Confirm data is accurate

4. **Cleanup:**
   - Delete test entries after verification

## 7️⃣ Test Add/Edit/Delete

### Test Add New
1. Click "Add New Awardee"
2. Fill in form:
   ```
   Name: Test User
   Email: test@example.com
   Country: Kenya
   CGPA: 4.0
   Course: Computer Science
   Bio: A test user for verification
   Year: 2024
   ```
3. Save
4. Verify appears in table
5. Check homepage if you marked as featured
6. Delete after testing

### Test Edit
1. Click edit on any awardee
2. Change name to "[Original Name] - EDITED"
3. Change country
4. Save
5. Verify changes in table
6. Check profile page shows updates
7. Change back to original values

### Test Delete
1. Create a test awardee first
2. Click delete button
3. Confirm deletion
4. Verify removed from table
5. Verify stats updated
6. Check removed from homepage if was featured

## 8️⃣ Performance Tests

### Load Test (If you have 400+ awardees)

```sql
-- Check total awardee count
SELECT COUNT(*) FROM public.awardees;

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM public.awardees
WHERE featured = true
  AND is_public = true;

-- Should use index and be fast (< 10ms)
```

### Page Load Test
1. Open admin panel
2. Open browser DevTools (F12)
3. Go to Network tab
4. Refresh page
5. Check:
   - ✅ `/api/awardees` request completes < 2 seconds
   - ✅ Page renders all awardees
   - ✅ No console errors

## 🐛 Common Issues & Fixes

### Issue: "featured" column doesn't exist
```sql
-- Add featured column if missing
ALTER TABLE public.awardees
ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;

-- Add index
CREATE INDEX IF NOT EXISTS awardees_featured_idx
ON public.awardees(featured);
```

### Issue: Admin access denied
```sql
-- Make yourself admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Issue: Real-time not working
```sql
-- Check publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Add awardees table to publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.awardees;
```

### Issue: View doesn't include featured
```sql
-- Check view definition
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'awardee_directory';

-- If featured is missing, re-run the view creation from:
-- supabase/migrations/002_create_awardees_table.sql
```

## ✅ Final Verification Checklist

- [ ] Database schema has `featured` and `is_public` columns
- [ ] Indexes exist on both columns
- [ ] `awardee_directory` view includes featured field
- [ ] Real-time publication includes awardees table
- [ ] Admin panel loads and shows all awardees
- [ ] Star button toggles featured status
- [ ] Eye button toggles visibility status
- [ ] Changes save to database immediately
- [ ] Homepage updates automatically (no refresh)
- [ ] `/awardees` page updates automatically
- [ ] Excel import works correctly
- [ ] Excel export works correctly
- [ ] Add/Edit/Delete functions work
- [ ] Stats update in real-time
- [ ] No console errors in browser
- [ ] API endpoints respond quickly

## 📊 Success Metrics

After completing all tests, you should observe:

1. **Admin to Homepage Sync:** < 2 seconds
2. **Admin to Awardees Page Sync:** < 2 seconds
3. **Database Write Time:** < 500ms
4. **Page Load Time:** < 3 seconds (even with 400+ awardees)
5. **Real-time Subscription:** Active (check browser console)
6. **Zero Errors:** No console errors or API failures

## 🎉 Next Steps

Once all tests pass:

1. ✅ Mark this setup as production-ready
2. ✅ Train other admins on the system
3. ✅ Set up regular backups (Excel exports)
4. ✅ Monitor performance over time
5. ✅ Collect feedback from team

## 📞 Support

If any test fails:
1. Check the error message in browser console
2. Review `DATABASE_SCHEMA_VERIFICATION.md`
3. Check Supabase logs in dashboard
4. Verify environment variables are set
5. Contact development team with specific error details

---

**Ready to test?** Start with section 1️⃣ and work through sequentially!

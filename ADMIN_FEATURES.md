# Admin Features Guide - Top100 Africa Future Leaders

## Overview
This guide covers all the admin features available for managing awardees, featuring profiles, and building comprehensive awardee pages.

## 🎯 Features Implemented

### 1. Featured Awardees Management

#### A. From Awardees Management Page (`/admin/awardees`)
- **Featured Toggle Button**: Each awardee row now has a ⭐ "Featured" button
- **Visual Indicator**: Featured awardees show a filled gold star icon
- **Quick Toggle**: Click the button to instantly feature/unfeature an awardee
- **Homepage Display**: Featured awardees automatically appear in the "Meet the Bold Minds Shaping Africa Tomorrow" section

**How to Feature an Awardee:**
1. Go to `/admin/awardees`
2. Find the awardee in the table
3. Click the "Feature" button in the "Featured" column
4. The button will turn gold and show "Featured"
5. The awardee will now appear on the homepage

#### B. From Edit Page (`/admin/awardees/edit/[id]`)
- **Featured Toggle Switch**: New section at the bottom of the edit form
- **Status Indicator**: Shows "Featured on homepage" or "Not featured"
- **Visual Feedback**: Gold star icon fills when featured
- **Description**: Clear explanation of what featuring means

### 2. Enhanced Profile Editor

The awardee edit page (`/admin/awardees/edit/[id]`) now includes:

#### Basic Information
- ✅ Name (required)
- ✅ Email
- ✅ Country
- ✅ CGPA
- ✅ Course/Field of Study
- ✅ Year
- ✅ Bio/Description
- ✅ Profile Image

#### Featured Status Section
- ✅ Toggle to feature/unfeature on homepage
- ✅ Visual star indicator

#### Profile Details Section
- ✅ **Headline**: Professional title or role (e.g., "Software Engineer & Community Builder")
- ✅ **Tagline**: Short inspiring statement or mission

#### Social Links Section
- ✅ LinkedIn
- ✅ Twitter
- ✅ GitHub
- ✅ Website

All fields are saved when you click "Update Awardee"

### 3. Awardees Management Dashboard

Located at `/admin/awardees`, the dashboard provides:

#### Statistics Cards
- Total Awardees
- Countries Represented
- Unique Courses/Fields
- Current Year Awardees
- Recent Awardees

#### Management Features
- ✅ **Search**: Filter awardees by name, country, course, or bio
- ✅ **Add New**: Create new awardee profiles
- ✅ **Edit**: Full profile editor with all fields
- ✅ **Delete**: Remove awardees (with confirmation)
- ✅ **Feature Toggle**: Quick feature/unfeature button
- ✅ **Visibility Toggle**: Show/hide profiles publicly
- ✅ **Import/Export**: Bulk operations with Excel files

#### Table Columns
1. Image - Profile picture preview
2. Name - Awardee's full name
3. Country - With badge styling
4. Course - Field of study
5. Year - Award year
6. **Featured** - ⭐ Toggle button (NEW!)
7. Visibility - 👁️ Public/hidden status
8. Actions - Edit & Delete buttons

### 4. Public Profile Pages

Awardee profile pages (`/awardees/[slug]`) display:

- **Hero Section**: Full-width cover image with name and tagline
- **Quick Info Cards**: CGPA, Course, Country, Award year
- **About Section**: Full bio
- **Social Links**: All connected social media accounts
- **Achievements**: Awards and recognition
- **Gallery**: Photos and media
- **Contact Card**: Email and other contact information

## 🚀 Quick Start Guide

### To Feature Awardees on Homepage:

**Method 1 - Quick Toggle (Recommended)**
1. Navigate to `/admin/awardees`
2. Scroll to find the awardee
3. Click the "Feature" button in the Featured column
4. Done! They'll appear on the homepage immediately

**Method 2 - From Edit Page**
1. Go to `/admin/awardees`
2. Click Edit button for the awardee
3. Scroll to "Featured Status" section
4. Toggle the switch to ON
5. Click "Update Awardee"

### To Build Complete Awardee Profiles:

1. Go to `/admin/awardees`
2. Click "Add New Awardee" OR click Edit for existing awardee
3. Fill in all sections:
   - **Basic Information**: Name, email, country, CGPA, course, year, bio
   - **Profile Image**: Upload a professional photo
   - **Featured Status**: Toggle if you want them on homepage
   - **Profile Details**: Add headline and tagline
   - **Social Links**: Add LinkedIn, Twitter, GitHub, Website
4. Click "Update Awardee" to save
5. The profile is now live at `/awardees/[slug]`

### To Manage Featured Awardees:

**Currently Featured:**
The homepage automatically shows awardees where `featured = true` in the database.

**To Replace Featured Awardees:**
1. Go to `/admin/awardees`
2. Click the gold "Featured" button to unfeature current ones
3. Click the "Feature" button for new ones
4. Changes are instant!

## 📊 Homepage Featured Section

The "Meet the Bold Minds Shaping Africa Tomorrow" section on the homepage:

- **Location**: Home page (`/`)
- **Section ID**: `#awardees`
- **Data Source**: Filters awardees where `featured = true`
- **Display**: Horizontal scrollable card layout
- **Cards Show**:
  - Profile image
  - Name
  - Country with flag
  - CGPA (if available)
  - Link to full profile

## 🔧 Technical Details

### Database Field
- **Field Name**: `featured`
- **Type**: Boolean
- **Default**: `false`
- **Table**: `awardees`

### API Endpoint
- **Route**: `/api/awardees`
- **Method**: `PUT`
- **Body**: `{ id: string, featured: boolean }`

### Component Files Modified
1. **Admin Management Page**: `app/admin/awardees/page.tsx`
   - Added Featured column
   - Added `handleToggleFeatured` function
   - Added Star icon import

2. **Admin Edit Page**: `app/admin/awardees/edit/[id]/page.tsx`
   - Added featured toggle switch
   - Added headline field
   - Added tagline field
   - Added social links (LinkedIn, Twitter, GitHub, Website)
   - Enhanced form schema

3. **Homepage Featured Section**: `app/components/HomeFeaturedAwardeesSection.tsx`
   - Changed from hardcoded names to database `featured` flag
   - Now dynamically filters featured awardees

4. **Excel Integration**:
   - Excel file updated with Featured column
   - Script created: `scripts/update-featured-in-supabase.ts`

## 📝 Notes

### Current Featured Awardees
As of now, 6 awardees are featured:
1. Abiodun Damilola
2. Babarinde Taofeek Olajide
3. Raheemat Oyiza Muhammad
4. Onofiok Lillian Okpo
5. Stephen Emmanuel
6. Mohammed Nimat Oyiza

### Best Practices
- Feature 4-8 awardees for optimal homepage display
- Ensure featured awardees have:
  - High-quality profile images
  - Complete bio information
  - CGPA filled in (displays prominently)
- Rotate featured awardees regularly to showcase different leaders
- Only feature awardees with `is_public = true`

## 🎨 Visual Design

### Featured Button States
- **Not Featured**: Outlined button with empty star icon
- **Featured**: Solid amber/gold button with filled star icon
- **Hover**: Scale animation on interaction

### Color Scheme
- Featured: `bg-amber-500` (gold/amber)
- Icons: `fill-current` when active
- Consistency with Top100 brand colors

## 🔐 Permissions

All admin features require:
- Admin authentication (already implemented)
- Access to `/admin/*` routes
- Proper session management

## 💡 Future Enhancements (Optional)

Potential features to consider:
- Bulk feature/unfeature operations
- Featured awardee ordering/priority
- Featured duration (auto-unfeature after X days)
- Featured categories (by country, field, etc.)
- Analytics on featured awardee views

---

## Support

For issues or questions about admin features:
1. Check this documentation
2. Review the code comments in the files listed above
3. Test features in the admin panel at `/admin/awardees`

**Admin Dashboard**: `/admin`
**Awardees Management**: `/admin/awardees`
**Homepage**: `/`

---

Built with ❤️ for Top100 Africa Future Leaders

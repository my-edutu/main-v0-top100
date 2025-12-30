# Quick Setup Guide - Email System

## 🚀 Quick Start (5 Minutes)

### Step 1: Apply Database Changes

**Option A: Supabase Dashboard (Recommended)**
1. Open your Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Copy and paste the contents of `scripts/002_create_interest_registrations_table.sql`
4. Click **Run**

**Option B: Command Line**
```bash
# Navigate to your project
cd "C:\Users\USER\Desktop\top100\v0_Top100Afl - Copy"

# Apply migration
npx tsx scripts/run-migrations.ts
```

---

### Step 2: Set Environment Variables

Add to your `.env.local` file:

```bash
# Get this from Brevo Dashboard → Settings → API Keys
BREVO_API_KEY=xkeysib-your-actual-api-key-here

# Optional (but recommended)
BREVO_SENDER_EMAIL=noreply@top100afl.com
CONTACT_FORM_NOTIFICATION_EMAIL=partnership@top100afl.com
```

---

### Step 3: Get Brevo API Key

1. Go to [Brevo.com](https://www.brevo.com) and sign up (free tier available)
2. Click on your profile → **SMTP & API**
3. Go to **API Keys** tab
4. Click **Generate a new API key**
5. Name it "Top100 AFL Website"
6. Copy the key and add to `.env.local`

---

### Step 4: Test Everything

**Test Newsletter (Homepage):**
```
1. Go to http://localhost:3000
2. Scroll to newsletter form at bottom
3. Enter an email and click Subscribe
4. Should see success message
```

**Test Contact Form:**
```
1. Go to contact section
2. Fill in name, email, message
3. Click Send
4. Should see success toast
5. Check your inbox at CONTACT_FORM_NOTIFICATION_EMAIL
```

**Test Join/Interest Form:**
```
1. Go to http://localhost:3000/join
2. Enter email
3. Click "Sign Up for Updates"
4. Should see "Thank You for Joining!" message
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Database tables exist in Supabase:
  - `newsletter_subscribers`
  - `contact_messages`
  - `interest_registrations`

- [ ] Environment variables are set:
  - `BREVO_API_KEY`
  - `BREVO_SENDER_EMAIL` (optional)
  - `CONTACT_FORM_NOTIFICATION_EMAIL` (optional)

- [ ] Test all forms:
  - [ ] Newsletter subscription works
  - [ ] Contact form works
  - [ ] Join page works

- [ ] Check Brevo dashboard:
  - [ ] New contacts appear
  - [ ] Email notifications received

---

## 📊 Where to Check Submissions

### Supabase Dashboard

1. Go to your Supabase project
2. Click **Table Editor**
3. Select table:
   - `newsletter_subscribers` - Newsletter signups
   - `contact_messages` - Contact form submissions
   - `interest_registrations` - Join/partner interest

### Brevo Dashboard

1. Log in to [Brevo](https://app.brevo.com)
2. Go to **Contacts**
3. View all captured emails with metadata

---

## 🔧 Troubleshooting

### "Failed to subscribe"
- ✅ Check `BREVO_API_KEY` is correct
- ✅ Check Brevo account is active
- ✅ Check browser console for errors

### "Database error"
- ✅ Run migration scripts
- ✅ Check Supabase connection
- ✅ Verify RLS policies exist

### "Email not sent"
- ✅ Verify sender email in Brevo
- ✅ Check Brevo sending limits
- ✅ Check spam folder

---

## 📝 What Changed?

### New Files Created:
1. `scripts/002_create_interest_registrations_table.sql` - Database migration
2. `app/actions/join.ts` - Server action for join form
3. `EMAIL_SYSTEM_DOCUMENTATION.md` - Full documentation
4. `SETUP_EMAIL_SYSTEM.md` - This guide

### Modified Files:
1. `app/join/page.tsx` - Now connected to real backend
   - Added `handleJoinSubmission` action
   - Removed mock submission
   - Added error handling

---

## 🎯 What's Captured Now?

### 1. Newsletter Subscriptions
- **Where:** Homepage footer, blog pages, magazine page
- **Stored:** Brevo contacts + `newsletter_subscribers` table
- **Data:** Email only

### 2. Contact Form
- **Where:** Contact section on homepage
- **Stored:** `contact_messages` table + Email to admin
- **Data:** Name, email, message

### 3. Join/Interest Registrations ✨ NEW
- **Where:** `/join` page
- **Stored:** `interest_registrations` table + Brevo contacts
- **Data:** Email, interest type, optional (name, org, country, phone)

---

## 📈 Next Steps (Optional)

1. **Create Admin Dashboard:**
   - View all submissions
   - Mark as read/replied
   - Export to CSV

2. **Set Up Email Campaigns:**
   - Welcome email for new subscribers
   - Follow-up for interest registrations
   - Newsletters

3. **Add More Fields:**
   - Add more optional fields to join form
   - Capture additional metadata

---

## 🆘 Need Help?

1. Read `EMAIL_SYSTEM_DOCUMENTATION.md` for detailed info
2. Check Supabase logs for database errors
3. Check Brevo dashboard for email delivery status
4. Verify `.env.local` has correct API keys

---

**Setup Time:** ~5 minutes
**Last Updated:** 2025-01-13

# Email & Interest Capture System Documentation

## Overview
Complete documentation for the Top100 Africa Future Leaders email capture and management system.

---

## 🗄️ Database Tables

### 1. **newsletter_subscribers**
Stores newsletter subscription emails.

```sql
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed'))
);
```

**Location:** Created by `scripts/001_create_contact_messages_table.sql`

---

### 2. **contact_messages**
Stores contact form submissions.

```sql
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied'))
);
```

**Location:** Created by `scripts/001_create_contact_messages_table.sql`

---

### 3. **interest_registrations** ✨ NEW
Stores join/partner/sponsor interest submissions.

```sql
CREATE TABLE public.interest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  interest_type TEXT NOT NULL CHECK (interest_type IN ('member', 'partner', 'sponsor', 'volunteer', 'general')),
  full_name TEXT,
  organization TEXT,
  message TEXT,
  country TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'declined'))
);
```

**Location:** Created by `scripts/002_create_interest_registrations_table.sql`

**Interest Types:**
- `member` - Wants to become a member/awardee
- `partner` - Partnership opportunity
- `sponsor` - Sponsorship interest
- `volunteer` - Volunteering interest
- `general` - General inquiry

---

## 🔌 Email Service Integration

### Brevo (Primary Email Service)

**API Endpoint:** `https://api.brevo.com/v3/contacts`

**Features Used:**
1. Contact creation/update
2. List management
3. Email notifications

**Environment Variables:**
```bash
BREVO_API_KEY=your_api_key_here
BREVO_SENDER_EMAIL=noreply@top100afl.com  # Optional
CONTACT_FORM_NOTIFICATION_EMAIL=partnership@top100afl.com  # Optional
```

---

## 📋 Implementation Details

### 1. Newsletter Subscription

**Component:** `app/components/NewsletterForm.tsx`
**Action:** `app/actions/newsletter.ts`
**Service:** `lib/brevo.ts`

**Flow:**
```
User enters email → Validates → Adds to Brevo contacts → Success message
```

**Brevo Attributes Set:**
- `SOURCE`: "Website Newsletter"
- `CREATED_AT`: ISO timestamp

**Usage:**
```tsx
import NewsletterForm from '@/app/components/NewsletterForm'

<NewsletterForm />
```

---

### 2. Contact Form

**Component:** `app/components/ContactSection.tsx`
**API:** `app/api/send-email/route.ts`
**Service:** `lib/email/brevo.ts`

**Flow:**
```
User submits form
  → Saves to contact_messages table (Supabase)
  → Sends email notification to admin (Brevo)
  → Shows success toast to user
```

**Email Notification:**
- **To:** `CONTACT_FORM_NOTIFICATION_EMAIL` (env var) or `partnership@top100afl.com`
- **From:** `BREVO_SENDER_EMAIL` or `noreply@top100afl.com`
- **Subject:** "New Contact Form Submission from {name}"
- **Content:** Name, email, message

---

### 3. Join/Interest Registration ✨ NEW

**Page:** `app/join/page.tsx`
**Action:** `app/actions/join.ts`

**Flow:**
```
User submits interest
  → Validates input
  → Saves to interest_registrations table (Supabase)
  → Adds to Brevo contacts with interest metadata
  → Returns success message
```

**Brevo Attributes Set:**
- `FIRSTNAME`: Extracted from full name
- `LASTNAME`: Extracted from full name
- `SOURCE`: "Join Page"
- `INTEREST_TYPE`: Type of interest (MEMBER, PARTNER, etc.)
- `ORGANIZATION`: Organization name (if provided)
- `COUNTRY`: Country (if provided)
- `CREATED_AT`: ISO timestamp

**Form Fields:**
- **Required:** `email`
- **Optional:** `fullName`, `organization`, `message`, `country`, `phone`
- **Hidden:** `interestType` (defaults to "member")

---

## 🚀 Setup Instructions

### Step 1: Apply Database Migrations

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run these files in order:
   - `scripts/001_create_contact_messages_table.sql`
   - `scripts/002_create_interest_registrations_table.sql`

**Option B: Using Command Line**
```bash
# If you have psql installed
psql YOUR_DATABASE_URL < scripts/001_create_contact_messages_table.sql
psql YOUR_DATABASE_URL < scripts/002_create_interest_registrations_table.sql
```

### Step 2: Configure Environment Variables

Add to `.env.local`:
```bash
# Brevo (required)
BREVO_API_KEY=xkeysib-your-api-key-here

# Optional customization
BREVO_SENDER_EMAIL=noreply@top100afl.com
CONTACT_FORM_NOTIFICATION_EMAIL=partnership@top100afl.com

# Resend (optional, for verification emails)
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=noreply@top100afl.com
```

### Step 3: Get Brevo API Key

1. Sign up at [Brevo.com](https://www.brevo.com)
2. Go to Settings → API Keys
3. Create a new API key
4. Copy and add to `.env.local`

### Step 4: Test the System

1. **Newsletter:** Visit homepage, scroll to newsletter form, subscribe
2. **Contact:** Visit contact section, submit a message
3. **Join:** Visit `/join`, submit interest

---

## 📊 Admin Access

### View Submissions in Supabase

**Newsletter Subscribers:**
```sql
SELECT * FROM newsletter_subscribers
ORDER BY subscribed_at DESC;
```

**Contact Messages:**
```sql
SELECT * FROM contact_messages
WHERE status = 'unread'
ORDER BY created_at DESC;
```

**Interest Registrations:**
```sql
SELECT * FROM interest_registrations
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### View Contacts in Brevo

1. Log into [Brevo Dashboard](https://app.brevo.com)
2. Navigate to Contacts
3. Filter by source:
   - "Website Newsletter"
   - "Join Page"
   - Contact form (sent via email)

---

## 🔍 Troubleshooting

### Issue: Emails not being captured

**Check:**
1. ✅ Environment variable `BREVO_API_KEY` is set
2. ✅ Database tables exist (run migrations)
3. ✅ Check browser console for errors
4. ✅ Check server logs for Brevo API errors

### Issue: Email notifications not sent

**Check:**
1. ✅ `BREVO_API_KEY` is valid
2. ✅ `BREVO_SENDER_EMAIL` is verified in Brevo
3. ✅ Check Brevo dashboard for delivery status
4. ✅ Check spam folder

### Issue: Database insert fails

**Check:**
1. ✅ RLS policies are set correctly
2. ✅ Tables exist with correct schema
3. ✅ Check Supabase logs for errors

---

## 📈 Usage Statistics

### Query Examples

**Total newsletter subscribers:**
```sql
SELECT COUNT(*) as total_subscribers
FROM newsletter_subscribers
WHERE status = 'active';
```

**Interest registrations by type:**
```sql
SELECT interest_type, COUNT(*) as count
FROM interest_registrations
GROUP BY interest_type
ORDER BY count DESC;
```

**Recent contact messages:**
```sql
SELECT
  name,
  email,
  LEFT(message, 50) as message_preview,
  created_at
FROM contact_messages
WHERE status = 'unread'
ORDER BY created_at DESC
LIMIT 10;
```

**Monthly growth:**
```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_registrations
FROM interest_registrations
GROUP BY month
ORDER BY month DESC;
```

---

## 🔐 Security Notes

1. **RLS Policies:**
   - All tables have RLS enabled
   - Public can INSERT (for submissions)
   - Only authenticated users can SELECT (view data)

2. **Environment Variables:**
   - Never commit `.env.local` to version control
   - Use separate API keys for dev/production

3. **Email Validation:**
   - All forms validate email format
   - Zod schemas prevent malformed data

---

## 🎯 Integration Points

### Where Email Capture Forms Appear

1. **Homepage Footer** - Newsletter form
2. **Contact Section** - Contact form
3. **Join Page** (`/join`) - Interest registration
4. **Magazine Page** - Newsletter form
5. **Blog Pages** - Newsletter form

### Future Enhancements

- [ ] Admin dashboard to view/manage submissions
- [ ] Email automation workflows in Brevo
- [ ] Export contacts to CSV
- [ ] Segment contacts by interest type
- [ ] Auto-responder emails
- [ ] Unsubscribe management

---

## 📝 API Reference

### POST `/api/send-email`

Send contact form notification.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I'd like to partner with you"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact form submitted and email notification sent successfully"
}
```

---

## 🆘 Support

For issues or questions:
1. Check this documentation
2. Review Supabase logs
3. Check Brevo dashboard
4. Verify environment variables
5. Test locally first

---

**Last Updated:** 2025-01-13
**Version:** 1.0
**Maintainer:** Top100 AFL Dev Team

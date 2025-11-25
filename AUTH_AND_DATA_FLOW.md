# Authentication and Data Flow in Top100 Africa Future Leaders Platform

## Overview
This document details the authentication system, data handling, and API communication between admin and frontend components in the Top100 Africa Future Leaders platform.

## Authentication System

### Files Involved
- `middleware.ts` - Main route protection and session management
- `utils/supabase/middleware.ts` - Supabase session handling with JWT validation
- `app/auth/signin/page.tsx` and `app/auth/signin/page-content.tsx` - Sign-in page and logic
- `app/api/auth/check-profile/route.ts` - Profile checking API endpoint
- `lib/auth-server.ts` - Server-side session handling and JWT decoding
- `lib/auth-utils.ts` - Role extraction and normalization utilities
- `lib/types/roles.ts` - Role definitions and validation
- `lib/supabase/client.ts` - Browser Supabase client with cookie management
- `lib/supabase/server.ts` - Server-side Supabase client

### Authentication Flow
1. Middleware intercepts requests and checks for valid session using `updateSession()`
2. If session is expired, user is redirected to sign-in page
3. Admin routes (`/admin`) require valid authenticated user
4. Sign-in page validates credentials via Supabase auth
5. Profile is checked via `/api/auth/check-profile` API endpoint
6. User is redirected based on role (admin to `/admin`, standard user to `/dashboard`)

### Session Management
- Uses Supabase auth with cookie storage
- Middleware checks session expiration (logs out if expired or expiring in <5 minutes)
- JWT tokens are decoded server-side to extract user information
- Session sync with Supabase real-time system

## Data Handling and API Routes

### Core API Files
- `app/api/awardees/route.ts` - CRUD operations for awardees
- `app/api/posts/route.ts` - CRUD operations for blog posts
- `app/api/events/route.ts` - Event management
- `app/api/youtube/route.ts` - YouTube integration
- `app/api/users/route.ts` - User management
- `lib/api/require-admin.ts` - Admin authorization guard

### Data Flow Patterns

#### Awardees Management
1. GET `/api/awardees` - Fetch all awardees with possible initialization from Excel
2. POST `/api/awardees` - Create new awardee with image upload to Supabase storage
3. PUT `/api/awardees` - Update awardee information (with FormData support for images)
4. DELETE `/api/awardees?id={id}` - Delete an awardee

#### Posts Management
1. GET `/api/posts` - Fetch posts with scope: admin/public/homepage
2. POST `/api/posts` - Create new post
3. PUT `/api/posts` - Update existing post
4. PATCH `/api/posts` - Partial updates (featured status, visibility, etc.)
5. DELETE `/api/posts` - Remove post

#### Authorization Checks
- `requireAdmin()` utility checks for admin access using both JWT and database roles
- Falls back to database role if JWT doesn't contain role information
- Logs role source (JWT vs database) for debugging
- Maintains role consistency between token and database

## Admin-to-Frontend Communication

### Key Admin Components
- `app/admin/page.tsx` - Dashboard with stats and quick links
- `app/admin/awardees/page.tsx` - Awardees management table with filtering
- `app/admin/awardees/edit/[id]/page.tsx` - Form for editing awardee details
- `app/admin/awardees/new/page.tsx` - Form for creating new awardee
- `app/admin/blog/page.tsx` - Blog post management
- `app/admin/events/page.tsx` - Event management

### API Communication Patterns

#### Fetching Data
- Admin components fetch data via `/api/*` routes using `fetch()` calls
- Real-time updates via Supabase channels (e.g., `admin-awardees-sync`)
- Stats calculations performed client-side after data retrieval

#### Form Submissions
- Create/Update operations use PUT/POST to `/api/*` routes
- Image uploads handled via FormData in POST requests
- Form validation using react-hook-form with Zod schema

#### Bulk Operations
- Multiple awardees can be selected and updated in bulk
- Individual API calls made in parallel for each selected item
- Toast notifications for success/error feedback

### Real-time Features
- Supabase real-time channels for live updates
- `admin-awardees-sync` - Syncs awardee changes across admin sessions
- `admin-posts-sync` - Syncs post changes
- `admin-events-sync` - Syncs event changes
- `public-events-feed` - Updates public event pages in real-time

## Security Features
- Role-based access control (admin, superadmin, editor, user)
- Service role key used for sensitive operations in API routes
- Row Level Security (RLS) in Supabase with service role bypass for admin operations
- Session validation with JWT token expiration checks
- Secure cookie handling with SameSite and Secure flags

## Data Models
- **Awardees**: Name, email, country, course, bio, image_url, slug, featured status, visibility
- **Posts**: Title, slug, content, cover_image, author, status, tags, featured status
- **Events**: Slug, schedule, location, registration info, feature flags, JSON metadata
- **Profiles**: Role, email, username, display_name, full_name, avatar_url, social links
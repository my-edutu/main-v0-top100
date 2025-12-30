# Admin Role Fix - Testing Plan

## Prerequisites

1. Install dependencies:
```bash
npm install jwt-decode
# or
pnpm add jwt-decode
```

2. Ensure `.env.local` has valid Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Start development server:
```bash
npm run dev
```

---

## Test 1: Diagnostic Script

**Purpose:** Check JWT vs Database role consistency

```bash
npx tsx scripts/test-auth-session.ts
```

**Expected Output:**
```
🔐 AUTH SESSION TEST - ENHANCED
================================================================================

1️⃣ Environment Variables Check:
   NEXT_PUBLIC_SUPABASE_URL: ✅
   NEXT_PUBLIC_SUPABASE_ANON_KEY: ✅
   SUPABASE_SERVICE_ROLE_KEY: ✅

2️⃣ Testing Sign In...
✅ Sign in successful!
   User ID: 12345678-1234-1234-1234-123456789abc
   Email: nwosupaul3@gmail.com
   Session exists: true

3️⃣ Decoding JWT Token (Server-Side View)...
   Token decoded successfully!
   Subject (user ID): 12345678-1234-1234-1234-123456789abc
   Email: nwosupaul3@gmail.com

   🔍 Searching for role in JWT claims:
   ✅ Found in user_metadata.role: admin

5️⃣ Comparing JWT vs Database Role...
   JWT Role: admin
   DB Role: admin
   ✅ Roles match!

7️⃣ Simulating API Guard Logic...
   NEW requireAdmin (after fix):
   - First checks JWT for role
   - JWT role: admin
   - Falls back to DB if JWT missing role
   - DB role: admin
   - Result: ✅ Would authorize (DB fallback)
```

**Pass Criteria:**
- ✅ All environment variables present
- ✅ Sign in successful
- ✅ JWT contains role claim
- ✅ Roles match between JWT and DB
- ⚠️ If "ROLE MISMATCH DETECTED", user needs to re-login

---

## Test 2: Check Profile Debug Endpoint

**Purpose:** Verify JWT token is being sent and decoded correctly

### Step 1: Get Access Token

Sign in via browser at `http://localhost:3000/auth/signin`, then open browser DevTools console and run:

```javascript
// Get Supabase session from local storage or cookies
const cookies = document.cookie.split(';');
const authCookie = cookies.find(c => c.trim().startsWith('sb-') && c.includes('-auth-token'));
console.log('Auth cookie:', authCookie);

// Or check localStorage
const session = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
console.log('Access Token:', session.access_token);
console.log('User ID:', session.user?.id);
```

### Step 2: Call Check Profile Endpoint

Replace `YOUR_ACCESS_TOKEN` and `YOUR_USER_ID` with values from Step 1:

```bash
curl -X POST http://localhost:3000/api/auth/check-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"userId": "YOUR_USER_ID"}'
```

**Expected Response (Success):**
```json
{
  "profile": {
    "role": "admin",
    "email": "nwosupaul3@gmail.com",
    "full_name": "Paul Nwosu"
  },
  "jwtData": {
    "userId": "12345678-1234-1234-1234-123456789abc",
    "email": "nwosupaul3@gmail.com",
    "role": "admin",
    "hasToken": true,
    "tokenPreview": "eyJhbGciOiJIUzI1NiI..."
  },
  "debug": {
    "roleMismatch": false,
    "jwtRole": "admin",
    "dbRole": "admin",
    "recommendation": "✅ JWT role matches database role."
  }
}
```

**Expected Response (Mismatch):**
```json
{
  "profile": {
    "role": "admin",
    "email": "nwosupaul3@gmail.com"
  },
  "jwtData": {
    "userId": "12345678-1234-1234-1234-123456789abc",
    "role": null
  },
  "debug": {
    "roleMismatch": true,
    "jwtRole": null,
    "dbRole": "admin",
    "recommendation": "⚠️  Role mismatch detected! User should sign out and sign in again to refresh their JWT token."
  }
}
```

**Pass Criteria:**
- ✅ Endpoint returns 200 OK
- ✅ `jwtData` is not null (token decoded successfully)
- ✅ `roleMismatch` is false (or user needs to re-login)
- ✅ Both JWT and DB roles show "admin"

---

## Test 3: Admin Page Access (Client-Side)

**Purpose:** Verify middleware allows access to admin pages

### Step 1: Navigate to Admin Dashboard

```
http://localhost:3000/admin
```

**Expected Result:**
- ✅ Page loads successfully (not redirected to sign-in)
- ✅ Admin dashboard UI visible
- ✅ No 403 errors in browser console

**Check Browser Console Logs:**
Look for middleware logs (if implemented):
```
🔒 [Middleware] Checking /admin access
🔒 [Middleware] User ID: 12345678-1234-1234-1234-123456789abc
🔒 [Middleware] Role: admin
🔒 [Middleware] ✅ Access granted
```

**Pass Criteria:**
- ✅ Can view admin pages
- ✅ No redirect loops
- ✅ Console shows no auth errors

---

## Test 4: Admin Mutation - Update User

**Purpose:** Verify API routes accept admin requests (the critical bug fix)

### Step 1: Get Access Token (same as Test 2)

### Step 2: Attempt User Update

```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "id": "USER_ID_TO_UPDATE",
    "role": "editor"
  }'
```

**Expected Response (Success):**
```json
{
  "id": "user-id-here",
  "name": "Test User",
  "email": "test@example.com",
  "role": "editor",
  "status": "active",
  "joinedDate": "2024-01-15T10:00:00.000Z",
  "lastActive": "2024-01-20T15:30:00.000Z"
}
```

**Check Server Logs:**
```
[requireAdmin] Starting admin authorization check
[requireAdmin] JWT token decoded: { userId: '...', roleFromJWT: 'admin', ... }
[requireAdmin] Database role: admin
[requireAdmin] Authorization summary: { jwtRole: 'admin', dbRole: 'admin', ... }
[requireAdmin] ✅ AUTHORIZED via jwt role: admin
```

**Expected Response (Failure - No Token):**
```json
{
  "message": "Authentication required",
  "debug": {
    "reason": "no_session"
  }
}
```
Status: 401 Unauthorized

**Expected Response (Failure - Not Admin):**
```json
{
  "message": "Admin access required",
  "debug": {
    "reason": "insufficient_privileges",
    "userId": "...",
    "roleFromJWT": "user",
    "roleFromDB": "user",
    "effectiveRole": "user",
    "requiresRelogin": false
  }
}
```
Status: 403 Forbidden

**Pass Criteria:**
- ✅ Admin users receive 200 OK with updated user
- ✅ Server logs show "AUTHORIZED via jwt role"
- ✅ Non-admin users receive 403 Forbidden
- ✅ Unauthenticated requests receive 401 Unauthorized

---

## Test 5: Admin Mutation - Create Profile

**Purpose:** Test the re-enabled profiles/ensure endpoint

```bash
curl -X POST http://localhost:3000/api/profiles/ensure \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "userId": "new-user-id-here",
    "email": "newuser@example.com"
  }'
```

**Expected Response:**
```json
{
  "message": "Profile created successfully",
  "profile": {
    "id": "new-user-id-here",
    "email": "newuser@example.com",
    "role": "user"
  }
}
```

**Pass Criteria:**
- ✅ Returns 200 OK (not 503 "auth disabled")
- ✅ Profile created in database
- ✅ Requires admin authentication

---

## Test 6: Token Refresh After Role Change

**Purpose:** Verify token refresh resolves role mismatch

### Step 1: Change User Role in Database

```sql
-- In Supabase SQL Editor
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"superadmin"}'::jsonb
WHERE email = 'nwosupaul3@gmail.com';

UPDATE profiles
SET role = 'superadmin'
WHERE email = 'nwosupaul3@gmail.com';
```

### Step 2: Test WITHOUT Re-login (Should Show Mismatch)

Run diagnostic script:
```bash
npx tsx scripts/test-auth-session.ts
```

**Expected:**
```
5️⃣ Comparing JWT vs Database Role...
   JWT Role: admin
   DB Role: superadmin
   🔥 ROLE MISMATCH DETECTED!
   This is why you can view /admin but cannot perform actions.
```

### Step 3: Sign Out and Sign In Again

1. Navigate to `http://localhost:3000/auth/signin`
2. Sign out completely
3. Clear browser cookies
4. Sign in again

### Step 4: Test AFTER Re-login (Should Match)

```bash
npx tsx scripts/test-auth-session.ts
```

**Expected:**
```
5️⃣ Comparing JWT vs Database Role...
   JWT Role: superadmin
   DB Role: superadmin
   ✅ Roles match!
```

**Pass Criteria:**
- ✅ Role mismatch detected before re-login
- ✅ Roles match after re-login
- ✅ JWT now contains updated role
- ✅ API mutations succeed with new role

---

## Test 7: Non-Admin User Blocked

**Purpose:** Ensure non-admin users cannot access admin endpoints

### Step 1: Create Test User (Non-Admin)

In Supabase Dashboard:
1. Authentication → Users → Invite User
2. Email: `testuser@example.com`
3. Set metadata: `{"role": "user"}`

Or via SQL:
```sql
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES ('testuser@example.com', '{"role":"user"}'::jsonb);

INSERT INTO profiles (id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'testuser@example.com'),
  'testuser@example.com',
  'user'
);
```

### Step 2: Sign In as Test User and Get Token

### Step 3: Attempt Admin Mutation

```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEST_USER_TOKEN" \
  -d '{
    "id": "some-user-id",
    "role": "admin"
  }'
```

**Expected Response:**
```json
{
  "message": "Admin access required",
  "debug": {
    "reason": "insufficient_privileges",
    "roleFromJWT": "user",
    "roleFromDB": "user",
    "effectiveRole": "user"
  }
}
```
Status: 403 Forbidden

**Server Logs:**
```
[requireAdmin] Starting admin authorization check
[requireAdmin] JWT token decoded: { userId: '...', roleFromJWT: 'user', ... }
[requireAdmin] Database role: user
[requireAdmin] ❌ FORBIDDEN - returning 403
```

**Pass Criteria:**
- ✅ Request denied with 403
- ✅ Debug info shows non-admin role
- ✅ No user data modified

---

## Test 8: Missing Token

**Purpose:** Verify requests without authentication are rejected

```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "some-user-id",
    "role": "admin"
  }'
```

**Expected Response:**
```json
{
  "message": "Authentication required",
  "debug": {
    "reason": "no_session"
  }
}
```
Status: 401 Unauthorized

**Pass Criteria:**
- ✅ Returns 401 Unauthorized
- ✅ No access to protected resources

---

## Test 9: Integration Test - Full Workflow

**Purpose:** End-to-end test of the bug fix

### Scenario: Admin creates a new user via UI

1. **Sign in as admin**
   - Navigate to `http://localhost:3000/auth/signin`
   - Sign in with admin credentials

2. **Access admin users page**
   - Navigate to `http://localhost:3000/admin/users`
   - ✅ Page loads (not blocked)

3. **Attempt to update a user**
   - Click "Edit" on a user
   - Change role to "editor"
   - Click "Save"
   - ✅ Update succeeds (not 403)

4. **Check server logs**
   - Look for `[requireAdmin]` logs
   - ✅ Shows "AUTHORIZED via jwt role: admin"
   - ✅ No role mismatch warnings

5. **Verify in database**
   - Check Supabase dashboard
   - ✅ User role updated to "editor"

**Pass Criteria:**
- ✅ All admin actions succeed
- ✅ No 403 errors
- ✅ Server logs show JWT-based authorization
- ✅ Database reflects changes

---

## Troubleshooting Guide

### Issue: "ROLE MISMATCH DETECTED"

**Cause:** JWT token contains different role than database

**Solution:**
1. Sign out completely
2. Clear browser cookies: `document.cookie.split(";").forEach(c => document.cookie = c.split("=")[0] + "=;expires=" + new Date().toUTCString())`
3. Restart dev server: `Ctrl+C` then `npm run dev`
4. Sign in again

### Issue: "No role found in JWT token"

**Cause:** User metadata doesn't contain role claim

**Solution:**
```sql
-- Add role to user metadata
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

Then sign out and sign in again.

### Issue: Still getting 403 after fixes

**Debug steps:**
1. Run diagnostic script: `npx tsx scripts/test-auth-session.ts`
2. Check server console for `[requireAdmin]` logs
3. Verify token is being sent: Check Network tab → Request Headers → Authorization
4. Call check-profile endpoint to see JWT vs DB comparison

### Issue: "Cannot find module 'jwt-decode'"

**Solution:**
```bash
npm install jwt-decode
# or
pnpm add jwt-decode
```

---

## Success Criteria Summary

✅ **All tests pass:**
- [ ] Diagnostic script shows matching roles
- [ ] Check profile endpoint returns role data
- [ ] Admin pages load successfully
- [ ] Admin mutations succeed (not 403)
- [ ] Non-admin users blocked from admin endpoints
- [ ] Missing tokens return 401
- [ ] Role changes require re-login
- [ ] Server logs show JWT-based authorization

✅ **Bug is fixed when:**
- User can view `/admin` pages AND
- User can perform admin mutations AND
- Server logs show "AUTHORIZED via jwt role" (not database fallback)
- No "ROLE MISMATCH" warnings in logs

---

## Next Steps After Testing

1. **Update production environment:**
   - Install `jwt-decode` dependency
   - Deploy updated code
   - Force all admins to re-login

2. **Monitor production logs:**
   - Watch for `[requireAdmin]` authorization decisions
   - Alert on repeated 403s from valid admins
   - Track role mismatch frequency

3. **Consider future improvements:**
   - Implement JWT signature verification
   - Add real-time role sync
   - Shorter token expiry for sensitive roles
   - Automatic token refresh on role change

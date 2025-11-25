# Security Features Documentation

## Overview

This document outlines the comprehensive security measures implemented in the Top100 Africa Future Leaders platform to protect user sessions and data.

## Implemented Security Features

### 1. Automatic Session Timeout (Inactivity Detection)

**Location**: `app/hooks/useInactivityTimeout.ts`, `app/components/SessionSecurityGuard.tsx`

**What it does**:
- Tracks user activity (mouse movements, keyboard input, clicks, scrolling, touch events)
- Automatically logs out users after **30 minutes** of inactivity
- Shows a warning dialog **2 minutes** before logout
- Provides countdown timer and option to extend session
- Synchronized across multiple browser tabs

**Configuration**:
```tsx
<SessionSecurityGuard
  timeoutMinutes={30}      // Total inactivity time before logout
  warningMinutes={2}       // Warning time before actual logout
  enabled={true}           // Enable/disable the feature
/>
```

**User Experience**:
1. User is inactive for 28 minutes
2. Warning dialog appears: "You will be logged out in 2:00"
3. User can click "Stay Logged In" to extend session
4. If no action, automatic logout at 30 minutes
5. Redirect to sign-in page with clear message

### 2. Server-Side Session Expiration

**Location**: `utils/supabase/middleware.ts`

**What it does**:
- Validates session on every page request
- Checks if Supabase JWT token has expired
- Automatically logs out users with expired sessions
- Prevents access to protected routes with stale sessions

**Security Benefits**:
- Prevents session hijacking from old/stolen cookies
- Enforces maximum session lifetime
- Dual-layer protection (client + server)

### 3. Cross-Tab Synchronization

**What it does**:
- Activity in one tab extends session in all tabs
- Logout in one tab logs out all tabs
- Prevents one tab from timing out while user is active in another

**How it works**:
- Uses `localStorage` to broadcast activity across tabs
- Checks for activity every 10 seconds
- Updates session timers across all tabs

### 4. Session Security on Device Sleep/Close

**What it does**:
- Validates session when user returns after closing laptop
- Checks session expiration on page visibility change
- Forces re-authentication if session expired while device was closed

**Protection against**:
- Leaving device unattended
- Long periods without activity
- Session persistence across device restarts

### 5. Security Messages & User Communication

**Location**: `app/auth/signin/page-content.tsx`

**Features**:
- Clear messages explaining why user was logged out
- Different messages for different scenarios:
  - **Inactivity**: "You have been logged out due to inactivity"
  - **Expired**: "Your session has expired"
  - **Security**: "For your security, please sign in again"
- Visual indicators (icons, colors) for security events

## Security Configuration

### Recommended Timeout Settings

| User Type | Inactivity Timeout | Warning Time | Rationale |
|-----------|-------------------|--------------|-----------|
| **Admin Users** | 30 minutes | 2 minutes | Higher security for privileged access |
| **Regular Users** | 60 minutes | 5 minutes | Balance between security and UX |
| **Public Pages** | Disabled | N/A | No sensitive data |

### Current Settings (Admin Panel)

```typescript
// app/admin/layout.tsx
<SessionSecurityGuard
  timeoutMinutes={30}      // ⏱️ 30 minutes of inactivity
  warningMinutes={2}       // ⚠️ 2 minutes warning before logout
  enabled={true}           // ✅ Always enabled for admin
/>
```

## How to Adjust Settings

### Change Timeout Duration

Edit `app/admin/layout.tsx`:

```typescript
// Increase to 60 minutes
<SessionSecurityGuard
  timeoutMinutes={60}
  warningMinutes={5}
/>

// Decrease to 15 minutes for higher security
<SessionSecurityGuard
  timeoutMinutes={15}
  warningMinutes={1}
/>
```

### Disable for Specific Pages

```typescript
// Disable security guard
<SessionSecurityGuard
  enabled={false}
/>
```

### Custom Activity Events

Edit `app/hooks/useInactivityTimeout.ts`:

```typescript
const { logout, resetTimer } = useInactivityTimeout({
  events: [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    // Add more events:
    'wheel',
    'pointerdown',
    'touchmove'
  ]
})
```

## Security Best Practices

### ✅ What We Implemented

1. **Multi-layer Protection**
   - Client-side inactivity detection
   - Server-side session validation
   - JWT token expiration checking

2. **User-Friendly Security**
   - Warning before logout (not sudden)
   - Clear explanations for security actions
   - Easy session extension

3. **Cross-Tab Awareness**
   - Activity in any tab counts
   - Consistent state across tabs
   - Synchronized logout

4. **Audit Trail**
   - Console logging of security events
   - Reason tracking for logouts
   - Session expiration monitoring

### 🔒 Additional Recommendations

1. **Enable HTTPS Only**
   - Set `secure: true` for all cookies in production
   - Use HSTS headers

2. **IP Address Validation** (Future Enhancement)
   - Track user's IP on login
   - Alert on IP changes
   - Force re-auth for suspicious changes

3. **Device Fingerprinting** (Future Enhancement)
   - Track browser/device characteristics
   - Detect session hijacking attempts

4. **Rate Limiting** (Future Enhancement)
   - Limit login attempts
   - Prevent brute force attacks

## Testing the Security Features

### Test Inactivity Timeout

1. Sign in to admin panel
2. Leave the page idle (no mouse/keyboard activity)
3. After 28 minutes, warning dialog should appear
4. Countdown starts from 2:00
5. At 0:00, automatic logout and redirect

### Test Session Expiration

1. Sign in to admin panel
2. Close laptop/put device to sleep for 4+ hours
3. Reopen device and refresh page
4. Should redirect to sign-in with "Session expired" message

### Test Cross-Tab Sync

1. Open admin panel in two browser tabs
2. Be active in Tab 1 only
3. Tab 2 should NOT timeout (activity syncs)
4. Log out from Tab 1
5. Tab 2 should also detect logout

## Troubleshooting

### Users Being Logged Out Too Quickly

**Cause**: Timeout set too low or activity events not firing

**Solution**:
```typescript
// Increase timeout
timeoutMinutes={60}  // instead of 30

// Add more activity events
events: ['mousedown', 'mousemove', 'keypress', 'scroll', 'wheel']
```

### Warning Not Appearing

**Check**:
1. Is `warningMinutes` > 0?
2. Is `onWarning` callback defined?
3. Check browser console for errors

### Session Not Persisting

**Possible Issues**:
1. Cookies not being set correctly
2. Supabase configuration issue
3. Browser blocking third-party cookies

**Debug**:
```javascript
// Check session in browser console
const { data } = await supabase.auth.getSession()
console.log('Session:', data.session)
```

## Code Locations

| Feature | File Path |
|---------|-----------|
| Inactivity Hook | `app/hooks/useInactivityTimeout.ts` |
| Security Guard Component | `app/components/SessionSecurityGuard.tsx` |
| Admin Layout (Implementation) | `app/admin/layout.tsx` |
| Middleware (Server-side) | `utils/supabase/middleware.ts` |
| Sign-in Messages | `app/auth/signin/page-content.tsx` |

## Security Event Logs

Monitor these console messages:

```
[Security] Inactivity timeout enabled: {timeout: "30 minutes", warningTime: "2 minutes"}
[Security] Inactivity warning triggered
[Security] Inactivity timeout reached
[Security] Logging out due to inactivity
[Security] Session expired, forcing logout
[Security] Admin session expiring in X minutes
```

## Compliance & Standards

This implementation follows:
- **OWASP**: Session Management Best Practices
- **NIST**: Digital Identity Guidelines (SP 800-63B)
- **PCI DSS**: Requirement 8.1.8 (Session timeout)

**Recommendation**: For financial or healthcare data, reduce timeout to 15 minutes.

## Support

For security-related questions or to report vulnerabilities:
- **Email**: security@top100afl.com
- **Internal**: Consult security team before modifying timeout settings

---

**Last Updated**: 2025
**Maintainer**: Top100 Africa Future Leaders Security Team

# Cross-Tab Logout Notification Feature

## Overview

When you sign out from one browser tab, all other tabs will immediately show a popup notification: **"You Are Signed Out"**

## How It Works

### 1. **Manual Logout**
When you click the "Logout" button in the admin panel:

**Tab 1 (where you clicked logout):**
- Shows "Logging out..." toast
- Signs out from Supabase
- Broadcasts logout event to all other tabs
- Redirects to sign-in page

**Tab 2, 3, 4... (other tabs):**
- Immediately detect the logout event
- Show popup dialog: 🔒 **"You Are Signed Out"**
- Message: "You have signed out in another tab"
- Button: "Go to Sign In" → Redirects to sign-in page

### 2. **Automatic Inactivity Logout**
When you're logged out due to inactivity (30 minutes):

**Tab 1 (where timeout occurred):**
- Shows warning at 28 minutes
- Auto-logout at 30 minutes
- Broadcasts logout event
- Redirects to sign-in page

**Tab 2, 3, 4... (other tabs):**
- Show popup: 🔒 **"You Are Signed Out"**
- Message: "You have been logged out due to inactivity in another tab"
- Button: "Go to Sign In"

### 3. **Session Expiration**
When your session expires (device was closed/sleeping):

**All tabs:**
- Detect expired session on next page load
- Show popup: 🔒 **"You Are Signed Out"**
- Message: "Your session has expired in another tab"
- Redirect to sign-in page

## Technical Implementation

### Broadcasting Mechanism

We use **two methods** for maximum browser compatibility:

1. **BroadcastChannel API** (modern browsers)
   - Fast, reliable, native browser API
   - Works in Chrome, Firefox, Edge, Safari 15.4+

2. **localStorage Events** (fallback)
   - Compatible with older browsers
   - Uses `storage` event listener

### Code Flow

```typescript
// When logging out
1. Broadcast event to all tabs
   ├─ localStorage.setItem('logout-event', {...})
   └─ BroadcastChannel.postMessage({type: 'logout'})

2. Sign out from Supabase
   └─ supabase.auth.signOut()

3. Clear local data
   └─ localStorage.clear(), sessionStorage.clear()

4. Redirect to sign-in
   └─ window.location.href = '/auth/signin?reason=manual'
```

```typescript
// In other tabs
1. Listen for events
   ├─ BroadcastChannel.onmessage
   └─ window.addEventListener('storage')

2. Detect logout event
   └─ if (event.type === 'logout')

3. Show popup dialog
   └─ "You Are Signed Out"

4. User clicks "Go to Sign In"
   └─ Redirect to sign-in page
```

## User Experience Examples

### Scenario 1: Normal Logout
```
You have 3 tabs open: Admin Dashboard, Blog Editor, Events Page

Action: Click "Logout" on Blog Editor tab

Result:
✅ Blog Editor → Redirects to sign-in
🔒 Admin Dashboard → Shows "You Are Signed Out" popup
🔒 Events Page → Shows "You Are Signed Out" popup
```

### Scenario 2: Inactivity Timeout
```
You have 2 tabs open: Admin Dashboard, Awardees Page

Action: Go away for 30 minutes (no activity)

Result:
⏱️ Admin Dashboard → Auto-logout at 30 minutes
🔒 Awardees Page → Shows "You Are Signed Out" popup
```

### Scenario 3: Multiple Devices
```
You're signed in on:
- Desktop: Chrome (3 tabs)
- Laptop: Firefox (2 tabs)

Action: Logout from Desktop Chrome

Result:
✅ Desktop Chrome (all 3 tabs) → Logged out
❌ Laptop Firefox → Still signed in (different device)
```

> **Note**: Cross-tab logout only works within the same browser on the same device. Different browsers or devices maintain separate sessions.

## Testing the Feature

### Quick Test (1 minute version)

1. **Prepare**
   - Open 2 tabs in the same browser
   - Sign in to admin panel on both tabs
   - Navigate to different pages (e.g., Dashboard, Blog)

2. **Test**
   - In Tab 1: Click "Logout" button
   - Watch Tab 2: Should show popup immediately

3. **Expected Result**
   ```
   Tab 1: Redirects to /auth/signin?reason=manual
   Tab 2: Shows popup "You Are Signed Out"
   ```

### Full Test (30 minute version)

1. **Setup**
   - Open 3 tabs in admin panel
   - Don't interact with any tab

2. **At 28 minutes**
   - All tabs show warning dialog
   - One tab shows "Session About to Expire"

3. **At 30 minutes**
   - One tab auto-logouts
   - Other 2 tabs show "You Are Signed Out" popup

## Customization

### Change Logout Messages

Edit `app/components/SessionSecurityGuard.tsx`:

```typescript
const getLogoutMessage = (reason: string): string => {
  switch (reason) {
    case 'inactivity':
      return 'Custom inactivity message'
    case 'expired':
      return 'Custom expiration message'
    case 'manual':
      return 'Custom manual logout message'
    default:
      return 'You have been signed out.'
  }
}
```

### Disable Popup (Not Recommended)

If you want to disable the popup and just redirect silently:

```typescript
// In SessionSecurityGuard.tsx, replace:
setShowLogoutNotification(true)

// With:
window.location.href = `/auth/signin?reason=${reason}`
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| BroadcastChannel | ✅ 54+ | ✅ 38+ | ✅ 15.4+ | ✅ 79+ |
| localStorage Events | ✅ All | ✅ All | ✅ All | ✅ All |
| Overall Support | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

## Troubleshooting

### Popup Not Showing in Other Tabs

**Check:**
1. Are tabs in the same browser?
2. Is SessionSecurityGuard enabled?
3. Check browser console for errors

**Debug:**
```javascript
// In browser console
localStorage.setItem('logout-event', JSON.stringify({
  timestamp: Date.now(),
  reason: 'test'
}))
// Should trigger popup in other tabs
```

### Popup Shows But Doesn't Redirect

**Possible Cause:** User dismissed popup without clicking button

**Solution:** Popup prevents closing without action. User must click "Go to Sign In"

### Multiple Popups Appearing

**Cause:** Multiple SessionSecurityGuard components mounted

**Solution:** Ensure SessionSecurityGuard is only in the admin layout (one instance)

## Security Considerations

### Why This Feature Matters

1. **Prevents Data Leaks**
   - If user logs out on work computer
   - All tabs close immediately
   - No residual access in forgotten tabs

2. **Compliance**
   - Meets security requirement: "All sessions must terminate together"
   - Prevents session hijacking via abandoned tabs

3. **User Awareness**
   - Clear communication about logout
   - Prevents confusion ("Why can't I access this?")
   - Professional UX

### Privacy

- No sensitive data transmitted between tabs
- Only logout event and reason are shared
- All data stays in user's browser (localStorage)

## Related Features

- [Session Security](./SECURITY_FEATURES.md) - Main security documentation
- [Inactivity Timeout](./SECURITY_FEATURES.md#1-automatic-session-timeout-inactivity-detection)
- [Session Expiration](./SECURITY_FEATURES.md#2-server-side-session-expiration)

---

**Last Updated**: 2025
**Feature Status**: ✅ Active in Production

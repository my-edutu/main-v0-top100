# Clear Session and Login Fresh

## Step 1: Clear Browser Session (Choose One Method)

### Method A: DevTools Application Tab (RECOMMENDED)
1. Press F12 to open DevTools
2. Click **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In left sidebar:
   - Click **Cookies** → `http://localhost:3000`
   - Right-click → **Clear**
   - Repeat for any `127.0.0.1` entries
4. In left sidebar:
   - Click **Local Storage** → `http://localhost:3000`
   - Right-click → **Clear**
   - Click **Session Storage** → `http://localhost:3000`
   - Right-click → **Clear**

### Method B: Console Script (Alternative)
Paste this into the browser console (F12 → Console tab):

```javascript
// Clear cookies
const cookies = document.cookie.split(";");
console.log(`Found ${cookies.length} cookies to clear`);

for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

    // Clear cookie
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    console.log(`Cleared: ${name}`);
}

// Clear storage
localStorage.clear();
sessionStorage.clear();

console.log('✅ All cookies and storage cleared!');
console.log('Now refresh the page and sign in again.');
```

### Method C: Incognito/Private Window (FASTEST)
1. Close all browser windows
2. Open a **new Incognito/Private window**
3. Go to `http://localhost:3000/auth/signin`
4. Sign in
5. Navigate to `/admin/blog`

## Step 2: Navigate to Sign In

After clearing session:
1. Go to: `http://localhost:3000/auth/signin`
2. You should be redirected to the sign-in page automatically

## Step 3: Sign In

Use your credentials:
- Email: `nwosupaul3@gmail.com`
- Password: [your password]

## Step 4: Verify Admin Access

After signing in:
1. Navigate to: `http://localhost:3000/admin/blog`
2. Check browser console for logs
3. Check server terminal for `[requireAdmin]` logs

### Expected Server Logs:
```
[requireAdmin] Starting admin authorization check
[requireAdmin] JWT token decoded: { userId: '...', roleFromJWT: 'admin', ... }
[requireAdmin] ✅ AUTHORIZED via jwt role: admin
```

### If You Still Get Errors:

Check browser console for the actual error message and run:

```javascript
// In browser console after signing in:
fetch('/api/auth/check-profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'f56630ad-006a-4389-a4be-448cd7bc77b1' })
})
  .then(r => r.json())
  .then(data => console.log('Profile check:', data))
```

This will show you exactly what the server sees.

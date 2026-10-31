# Android and web update release checklist

## Architecture

Keep the Next.js application hosted at https://www.top100afl.com. Package that
origin using a Trusted Web Activity (Bubblewrap). Do not static-export the
application: its authentication, route handlers and server features need Next.js.

The web release updates over the network. On launch, foreground, reconnect and
every five minutes while visible, AppUpdateNotice compares the bundled release
ID with `/api/app-version`. A new release displays a refresh action. Refresh is
user initiated and asks for confirmation after form edits. Failed requests time
out after 15 seconds so later checks can retry. Background browser timers may be
suspended; foreground checks cover that case.

The service worker does not cache dashboards, API responses or application code.
Only `/offline.html` is precached. Offline navigation shows that generic page;
it does not promise saved data or offline writes. Normal navigation bypasses the
browser HTTP cache. Worker registration bypasses the worker script cache.

## Required Android setup

1. Create the app in Play Console and choose its permanent package ID. Proposed
   ID: `com.top100afl.app`; confirm before creating the Android project.
2. Generate the TWA project with Bubblewrap using
   `https://www.top100afl.com/site.webmanifest`. Target Android API 36 or newer.
3. Protect and back up the upload keystore outside Git. Enable Play App Signing.
4. In the deployment environment configure `ANDROID_PACKAGE_NAME` and
   `ANDROID_SHA256_CERT_FINGERPRINTS`. The latter is the colon-separated SHA-256
   **app signing** certificate from Play Console → App integrity, not merely the
   upload certificate. Multiple certificates may be comma separated for rotation.
5. Deploy and verify `https://www.top100afl.com/.well-known/assetlinks.json`
   returns HTTP 200 JSON with the correct package and signing certificate, without
   a redirect. It deliberately returns 503 while missing or malformed.
6. Build the signed AAB, upload to an eligible testing track and install from
   Google Play. Verify full screen launch and HTTPS deep links on a real phone.

On this Mac, Android Studio supplies Java 21 at
`/Applications/Android Studio.app/Contents/jbr/Contents/Home`; Android SDK is at
`/Users/MAC/Library/Android/sdk` and build tools 36.0.0 are installed. Set JAVA_HOME
for the build shell to that JDK; the system Java launcher alone finds no runtime.

## Verify each OTA release

1. Build and deploy a new commit. `NEXT_PUBLIC_APP_RELEASE` is injected by
   next.config.mjs from the deployment ID. Give releases distinct IDs; rebuild
   when changing browser code or public build-time environment variables.
2. Keep an old installed app open with an edited form. Bring it to the foreground
   after deployment. Confirm the update notice appears without reloading the form.
3. Tap Refresh now. Confirm cancellation retains the form; after saving, confirm
   refresh loads the new release and the notice disappears.
4. Disconnect the network, navigate/reload, and check the offline fallback.
   Reconnect and tap Try again. Confirm login/session continuity.
5. Check push delivery and notification taps after worker replacement.

Changing the package ID, signing configuration, Android permissions, native
integrations or Android SDK requires an Android build and Play release. Web
deployment does not update those parts or bypass store policies.

## Before requesting public release

- Test member login, recovery, sign-out, uploads, payments, deep links and Android
  back navigation with an authorized test account on a real Android phone.
- Review the existing email-based account deletion request flow and provide the
  public deletion request URL required by Play. Confirm actual request handling.
- Complete privacy, Data safety, target audience, content rating, reviewer access,
  screenshots and support details in Play Console. Review digital purchase rules
  for any paid features shipped in the app.
- Check production access eligibility and required testing in Play Console.

Local automated tests are not evidence of a deployed two-release OTA transition,
a signed Android build, successful Play signing association, or store approval.

# Top100 AFL Android

Bubblewrap-generated Trusted Web Activity for `https://www.top100afl.com/dashboard`.
Package ID: `com.top100afl.app`; initial version: `1.0.0` (code 1); target API 36.
Requires Android 7.0 (API 24) or newer, matching Android Browser Helper 2.7.4.

Build from the repository root: `python3 scripts/build-android.py`.
Requires JDK 21, Android SDK platform 36 and build-tools 36.0.0. The script finds
Android Studio's bundled JDK on macOS, or accepts JAVA_HOME and ANDROID_HOME.
It outputs a signed AAB for Play and an APK for device testing under
`output/android/1.0.0/`. No Play account credentials are needed to build.

The first build creates an upload keystore and password under
`~/.android/top100afl-signing/`, outside Git. Back up that entire private folder
securely. Reuse it for updates. Never upload the password or keystore to Git.
The exported upload certificate is public and may be provided to Play.

Before a later release, increase versionCode and versionName in app/build.gradle
and appVersionCode/appVersion in twa-manifest.json together. Keep the package ID.

Full screen verification requires deploying /.well-known/assetlinks.json with
the correct signing certificate. A directly installed APK uses the local upload
certificate. Play-installed apps normally use the separate Play app-signing
certificate. Configure both if testing both distributions. Without verification,
the browser can show its toolbar. See ../docs/operations/android-release.md.

The app loads the hosted site. Local website changes are not embedded in this
bundle; deploy them to update the live app. Changes to Android configuration
require a new bundle and Play release. This bundle has not been approved by Play.

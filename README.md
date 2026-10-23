# My Finance

My Finance is a React/Vite finance tracker packaged with Capacitor for Android. It uses **email and password authentication only**. There are no Google, OAuth, or social sign-in flows. Signed-in transaction data is stored in Supabase Postgres and protected by row-level security (RLS). Existing device/browser records remain available locally until you explicitly copy them into your account.

## Finance features

- Dashboard balance, income, expenses, savings rate, status, insights, recent transactions, and six-month trend.
- Midnight Emerald dark theme and Clean Ivory light theme, with System preference and a dashboard theme shortcut.
- Home quick actions for adding income or expenses.
- Income and expense records with all original categories, positive-amount validation, date, description, editing, and confirmed deletion.
- Search by description/category, type and category filters, clear filters, and date/creation-time sorting.
- Expense-category donut and breakdown, six-month expense trend, and spending insights.
- PKR formatting (`₨`) with grouped amounts.
- JSON backup export and validated import. Imports merge records, skip duplicate IDs, and ask before writing.
- Local theme preference and secure native session persistence on Android. The Supabase JavaScript client stores the web preview session in browser storage.
- Android email-link callback, back handling, mobile keyboard resizing, safe-area spacing, and bundled app assets.

New installations start with an empty transaction list. The old HTML source created example entries automatically; these are intentionally not inserted into real accounts.

## Supabase setup: email and password only

Use the existing My Finance Supabase project and its existing transaction table, accounts, and RLS policies. Do not create a replacement project or rerun a schema migration during web deployment. The project URL and publishable key are read from `.env.local` for local builds and from Vercel environment variables for hosted builds. Supabase's publishable key is intended for client-side use when RLS is enabled; **never put a `service_role` or secret key in Vite variables or frontend code**. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)

1. Create a Supabase project and open **Authentication → Sign In / Providers**. Enable **Email**. Leave Google and every other social provider disabled; My Finance has no social-login code. Phone and anonymous sign-in are not used.
2. In **Authentication → URL Configuration**, keep any working URLs and add these redirect URLs for local development and Android:

   ```text
   http://localhost:5173/**
   http://127.0.0.1:5173/**
   com.hmzkiani.myfinance://auth/callback
   ```

   Email confirmation and recovery links return to the current web origin in a browser and to the Android app callback on-device. Capacitor handles the Android deep link using its app URL event. The production Site URL and Vercel redirect entries are described in the deployment section below. [Capacitor deep links](https://capacitorjs.com/docs/guides/deep-links)
3. In **Authentication → Email**, choose whether **Confirm email** is enabled. With it enabled, new accounts see a verification notice and cannot sign in until Supabase confirms the email. Supabase uses the requested email redirect URL for confirmation and password reset. [Supabase sign-up](https://supabase.com/docs/reference/javascript/auth-signup) · [Password reset email](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
4. The migration at [`supabase/migrations/20261023000100_finance_transactions.sql`](supabase/migrations/20261023000100_finance_transactions.sql) is for a first-time installation only. This Vercel deployment uses the existing database and RLS policies; do not rerun the migration or reset existing data as part of deployment.
5. Copy `.env.example` to `.env.local` in the project root. Replace the placeholders with your own **Project URL** and **Publishable key** from **Project Settings → API**. A legacy anon key is also accepted, but the preferred variable is `VITE_SUPABASE_PUBLISHABLE_KEY`.

   ```powershell
   Copy-Item .env.example .env.local
   # Edit .env.local and insert your own Supabase URL and publishable key.
   ```

   Do not put database passwords, `service_role`, or `sb_secret_…` keys in `.env.local`. Vite embeds `VITE_` variables into the app bundle, so only the publishable/anon key is suitable there. The app rejects recognizable service-role keys at startup.

6. Restart Vite after editing environment variables. Create an account with full name, email, and password in the app. The password is sent to Supabase Auth and is never saved as a finance record. Login, reset, and account confirmation links use email and password only.

For password recovery, request a link from **Forgot password?**, open it on the same device/browser, and submit a new password. Supabase must allow the redirect URL above and have its email provider configured. On Android, links open through the registered `com.hmzkiani.myfinance://auth/callback` scheme.

## Install and run the web preview

Requirements: Node.js 20.19+ or 22.12+ and npm.

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). If Supabase is not configured, the app explains how to provide the project URL and publishable key. The web preview needs an internet connection to use Supabase Auth and account data.

## Deploy this existing app to Vercel

The web app is the same Vite/React codebase used by Capacitor. It does not create another frontend, Supabase project, auth system, or database. Vercel serves the `dist/` output, and the SPA rewrite sends direct browser paths and refreshes back to `index.html`. Capacitor continues to package the same build into Android.

### Push the project to GitHub

Create an empty GitHub repository (do not initialize it with a README), then run these commands from this project directory. Substitute your repository URL in the `git remote add` command:

```powershell
git init
git add .
git commit -m "Prepare My Finance web deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

`.env.local` is excluded by `.gitignore`; verify it is not included in a commit. Never upload a service-role key, password, signing key, or `.env.local`.

### Import and configure the repository on Vercel

1. In Vercel, choose **Add New → Project**, import the existing GitHub repository, and keep the project root at the repository root.
2. Use the Vite defaults or set **Framework Preset** to Vite, **Build Command** to `npm run build`, and **Output Directory** to `dist`.
3. In **Environment Variables**, add these exact names for Production and Preview (and Development if you use Vercel's development environment):

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   ```

   Enter the existing project's URL and publishable key privately in Vercel. The browser bundle necessarily contains the publishable key; never configure a `service_role` or `sb_secret_…` key. The existing RLS policies must continue to enforce per-user access.
4. Deploy. Later Git pushes to the connected branch trigger Vercel builds. When changing a Vercel environment variable, redeploy so the Vite build picks up its value.

Vercel setup instructions: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) · [Vercel project configuration](https://vercel.com/docs/project-configuration).

### Allow the web domain in existing Supabase Auth settings

In the existing Supabase project, open **Authentication → URL Configuration**. Add the deployed production origin as a **Redirect URL**, for example:

```text
https://YOUR-PROJECT.vercel.app/**
```

If using a custom domain, add its exact origin too, such as `https://finance.example.com/**`. To support Vercel preview deployments, Supabase documents the pattern `https://*-YOUR-TEAM-OR-ACCOUNT-SLUG.vercel.app/**`. Keep all currently working localhost and Android callback URLs in the list; add the new entries without replacing them. The app's web email confirmation and password recovery links return to the current web origin. Set **Site URL** to the canonical production site only if appropriate for this existing project; that is the fallback for email links that omit an explicit redirect. Do not remove the Android callback `com.hmzkiani.myfinance://auth/callback`.

Supabase's redirect allow-list and wildcard behavior are documented at [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). After deployment, test email confirmation and password recovery using a real account and verify the callback returns to the deployed web origin.

## Local data and migration

Browser storage belongs to its browser origin; it does **not** transfer automatically into an APK. If the existing browser dashboard is still available in the same browser/profile, export its `my_finance_transactions_v1` JSON value there, then sign in to the new app. Paste this into that browser's developer console to download the legacy data:

```js
const data = localStorage.getItem('my_finance_transactions_v1') || '[]';
const link = document.createElement('a');
link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
link.download = 'my-finance-transactions.json';
link.click();
URL.revokeObjectURL(link.href);
```

Existing records already present in the Android WebView's local storage or Capacitor Preferences are detected under **Settings → Import local records**. The app asks before copying them to the signed-in account, skips IDs already in that account, and keeps the device copy. For browser-to-Android transfer, choose the downloaded file in **Settings → Import backup**. Export a backup before changing devices.

JSON imports are validated against the app's transaction categories, types, positive amounts, and dates. Invalid records and repeated IDs are skipped and reported. Import merges with account data; it does not replace or clear existing rows.

## Open and build Android

Requirements: Android Studio with Android SDK Platform 36 and Build Tools 36.0.0 (or compatible newer packages), and a Gradle-supported JDK (JDK 21 is recommended). Set `JAVA_HOME` and `ANDROID_HOME` or `ANDROID_SDK_ROOT`.

Synchronize the checked-in Android project and open it in Android Studio:

```powershell
npm install
npm run cap:sync
npx cap open android
```

The application ID is `com.hmzkiani.myfinance` and the display name is `My Finance`. If you are adding the Android platform to a fresh checkout that does not contain `android/`, run `npx cap add android` once before `npm run cap:sync`.

Build a debug APK from the project root:

```powershell
npm run cap:sync
Set-Location android
./gradlew.bat assembleDebug
```

The APK path is `android/app/build/outputs/apk/debug/app-debug.apk`. Android Studio can also use **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

For a signed release APK or Android App Bundle, open Android Studio and choose **Build → Generate Signed Bundle / APK**, select **APK** or **Android App Bundle**, then create or choose a release keystore. Keep its credentials securely backed up. For command-line release builds, configure a signing config in `android/app/build.gradle` using private local Gradle properties or environment variables, then run `./gradlew.bat assembleRelease` or `./gradlew.bat bundleRelease` from `android/`.

## Privacy and security

- Supabase Auth handles password hashing, verification, and reset. My Finance never stores passwords.
- On Android, Supabase session data is stored using the native secure-storage plugin backed by Android Keystore encryption. In a browser preview, the Supabase JS client persists its session in browser storage; use a trusted device/profile and sign out when appropriate. [Capacitor secure storage](https://github.com/aparajita/capacitor-secure-storage) · [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)
- Transaction data is sent to your configured Supabase project so it can be associated with an account and accessed across that account's sessions. The app does not send it to any other service. Your Supabase project's access and retention settings apply.
- Account deletion of transaction rows is available under Settings and requires confirmation. It does not clear the local source records or device theme.
- Supabase access depends on network connectivity. Previously loaded data is not silently edited while offline; the app blocks changes if the account rows could not be loaded.

## Verification and known limits

- `npm test`: finance calculation, filtering/sorting, import validation, cloud serialization, and user-scoped query/write checks.
- `npm run build`: production Vite build with locally bundled React and Capacitor code.
- Real signup, verification, reset, login/session restoration, and cross-account RLS checks require valid credentials and two test users in a Supabase project. No credentials were provided, so those live-service flows cannot be truthfully reported as tested.
- A debug APK and emulator checks require Android Studio's JDK and SDK. If the environment lacks them, install JDK 21 and Android SDK Platform 36 / Build Tools 36.0.0 in Android Studio → **Tools → SDK Manager**, then run the debug build commands above.

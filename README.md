# Yaad (याद)

Local-first reminders, to-dos, and simple expense/lend tracking. Everything stays on this phone — no accounts, no cloud.

**Don't remember. Just Yaad.**

## What it does

- **Dashboard** — greeting, this week's reminders/to-dos, today's counts, next alert, monthly expense & lend
- **To-Do** — personal one-off items with Today / This week / Overdue / Done filters
- **Yaad Voice** — center tab: guided two-step voice ("To-do, Reminder, or Expense?" → speak what to add)
- **Reminders** — medicine, calls, appointments, and repeating alerts
- **Expense** — office/personal spend and money lent (Rs), stored in SQLite on device
- **Settings** — your name, theme, text size, quiet hours, alerts, voice language, notifications

Voice input works on-device (English / Nepali / Newari when the phone has a model).

## Navigation

Six bottom tabs — Dashboard, To-Do, **Yaad Voice**, Reminders, Expense, Settings.

## Stack

Expo SDK 57, React Native, TypeScript, expo-router, expo-sqlite, expo-notifications, expo-speech-recognition, AdMob.

## Ads

- **Full-screen** once per cold start (not during onboarding or when opened from a notification).
- **Banner** on Expense and Settings only.

Android production AdMob IDs are in `lib/ads/units.ts` and `app.json`.

## Run (dev)

```bash
npm install
npx expo start
```

Voice and exact alarms need a development build or release APK, not Expo Go.

## Release APK (sideload)

```bash
npm run build:apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## Play Store (AAB)

```bash
npm run build:aab
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

## Principle

Reminders, voice, photos, and expense entries never leave the phone. Notification **Done** and **Snooze** work from the lock screen via the background action handler.

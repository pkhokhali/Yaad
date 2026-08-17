# Yaad (याद)

Local-first, voice-first reminders. Everything stays on this phone — no accounts, no cloud.

**Don’t remember. Just Yaad.**

## What it does

- **Today** — next reminder as a large card with Done on the card; type or tap the mic below
- **Later** — reminders after today
- **Me** — Dark/Normal theme, Standard/Comfort text size, quiet hours, alerts, voice language
- On-device voice (English / Nepali / Newari when the phone has a model)
- Daily tasks, photos, checklists, overdue label with a clock icon

## Stack

Expo SDK 57, React Native, TypeScript, expo-router, expo-sqlite, expo-notifications, expo-speech-recognition, AdMob.

## Ads

- **Full-screen** once per cold start (first open, or after the app is fully closed and opened again). Not shown when returning from the home screen, during onboarding, or when opened from a reminder notification.
- **Banner** only on Later and Me, 50pt tall, above the tab bar. Never on Today next to the mic.

Android production AdMob IDs are in `lib/ads/units.ts` and `app.json`. After changing the App ID, run `npx expo prebuild --platform android` before the next native build so the manifest picks it up.

## Run (dev)

```bash
npm install
npx expo start
```

Voice and exact alarms need a development build or release APK, not Expo Go.

## Release APK (sideload)

Requires JDK 17 and an Android SDK (this repo looks for `ANDROID_HOME`, `D:\Android\Sdk`, then `%LOCALAPPDATA%\Android\Sdk`).

```bash
npm install
npm run build:apk
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Gradle caches stay in `.gradle-home/` (gitignored).

After `expo prebuild`, restore `android/local.properties` if needed (`sdk.dir=D:\\Android\\Sdk`).

## Play Store (AAB)

```bash
npx eas build --platform android --profile production
```

`eas.json` production profile builds an app bundle and auto-increments the version. Submit stays on the internal track as a draft.

## Principle

Reminders, voice, and photos never leave the phone. Ads are a separate Google network request and do not include reminder content.

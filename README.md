# Yaad (याद)

Local-first reminder app for busy field professionals. Capture in under 5 seconds; get interrupted at the right moment. Everything stays on-device — no accounts, no backend, no cloud sync.

## Stack

- Expo (managed) + React Native + TypeScript
- expo-router navigation
- expo-sqlite persistence
- expo-notifications local scheduling
- expo-speech-recognition voice capture
- chrono-node natural-language date parsing
- Zustand state

## Screens

1. **Home** — today’s reminders, streak badge, combined text/voice capture bar
2. **Add reminder** — editable confirmation after type or speak
3. **Reminder detail** — edit, repeat, snooze, done, delete
4. **Settings** — quiet hours, default urgency, notification style

## Notifications

- `standard` — one local alert at `due_at`
- `escalating` — nudge at `due_at - 60m`, alert at `due_at`
- Quiet hours defer fires to the end of the quiet window (unless urgent)
- Repeat rules schedule the next occurrence when marked done

## Run

```bash
npm install
npx expo start
```

Voice recognition and reliable exact-alarm scheduling work best in a development build (`npx expo run:android` / `npx expo run:ios`), not only Expo Go.

## Principle

The notification is the product. Capture → schedule → interrupt. Nothing leaves the phone.

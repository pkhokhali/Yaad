import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { parseCaptureText } from '@/lib/services/parser';
import { normalizeSpeechTranscript } from '@/lib/services/speechRecognition';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { AppSettings } from '@/types';

export type VoiceCaptureResult =
  | { status: 'saved'; title: string }
  | { status: 'confirm' }
  | { status: 'empty' };

/** Parse voice/text and save immediately when confident, else open confirm. */
export async function submitVoiceCapture(
  rawText: string,
  settings?: AppSettings,
): Promise<VoiceCaptureResult> {
  const text = normalizeSpeechTranscript(
    rawText.trim(),
    settings?.voiceLanguage ?? useSettingsStore.getState().voiceLanguage ?? 'en',
  );
  if (!text) return { status: 'empty' };

  const appSettings = settings ?? useSettingsStore.getState().getSettings();
  const addReminder = useReminderStore.getState().addReminder;

  try {
    const parsed = await parseCaptureText(text);
    if (parsed.confident) {
      await addReminder(
        {
          title: parsed.title,
          notes: parsed.rawText,
          due_at: parsed.dueAt.getTime(),
          category: parsed.category,
          repeat_rule: parsed.repeatDaily ? 'daily' : null,
          items: parsed.items,
        },
        appSettings,
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { status: 'saved', title: parsed.title };
    }
  } catch {
    // fall through to confirm screen
  }

  router.replace({
    pathname: '/add',
    params: { draft: text, fromVoice: '1' },
  });
  return { status: 'confirm' };
}

export function openVoiceCapture(options?: {
  draft?: string;
  autoListen?: boolean;
}): void {
  router.push({
    pathname: '/capture',
    params: {
      ...(options?.draft ? { draft: options.draft } : {}),
      voice: options?.autoListen === false ? '0' : '1',
    },
  });
}

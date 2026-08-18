import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { parseCaptureText } from '@/lib/services/parser';
import { normalizeSpeechTranscript } from '@/lib/services/speechRecognition';
import {
  kindLabel,
  parseExpenseVoice,
  VoiceAddKind,
} from '@/lib/services/voiceGuide';
import { useMoneyStore } from '@/store/useMoneyStore';
import { useReminderStore } from '@/store/useReminderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { AppSettings } from '@/types';

export type VoiceCaptureResult =
  | { status: 'saved'; title: string }
  | { status: 'confirm' }
  | { status: 'empty' };

function openConfirm(kind: VoiceAddKind, draft: string) {
  if (kind === 'expense') {
    router.replace({
      pathname: '/money/add',
      params: { kind: 'expense', draft },
    });
    return;
  }
  const mode = kind === 'todo' ? 'todo' : 'reminder';
  router.replace({
    pathname: '/add',
    params: { draft, fromVoice: '1', mode },
  });
}

/** Parse voice/text and save immediately when confident, else open confirm. */
export async function submitVoiceCapture(
  rawText: string,
  settings?: AppSettings,
  kind: VoiceAddKind = 'reminder',
): Promise<VoiceCaptureResult> {
  const text = normalizeSpeechTranscript(
    rawText.trim(),
    settings?.voiceLanguage ?? useSettingsStore.getState().voiceLanguage ?? 'en',
  );
  if (!text) return { status: 'empty' };

  const appSettings = settings ?? useSettingsStore.getState().getSettings();

  if (kind === 'expense') {
    const parsed = parseExpenseVoice(text);
    if (!parsed) {
      openConfirm('expense', text);
      return { status: 'confirm' };
    }
    await useMoneyStore.getState().addEntry({
      kind: 'expense',
      title: parsed.title,
      amount: parsed.amount,
      ledger: parsed.ledger,
      notes: text,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return {
      status: 'saved',
      title: `${kindLabel('expense', appSettings.voiceLanguage)} · Rs ${parsed.amount}`,
    };
  }

  const addReminder = useReminderStore.getState().addReminder;

  try {
    const parsed = await parseCaptureText(text);
    const category = kind === 'todo' ? 'general' : parsed.category;
    const repeat_rule =
      kind === 'todo' ? null : parsed.repeatDaily ? 'daily' : null;

    if (parsed.confident) {
      await addReminder(
        {
          title: parsed.title,
          notes: null,
          due_at: parsed.dueAt.getTime(),
          category,
          repeat_rule,
          items: parsed.items,
        },
        appSettings,
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return {
        status: 'saved',
        title: `${kindLabel(kind, appSettings.voiceLanguage)} · ${parsed.title}`,
      };
    }
  } catch {
    // fall through to confirm screen
  }

  openConfirm(kind, text);
  return { status: 'confirm' };
}

export function openVoiceCapture(options?: {
  draft?: string;
  autoListen?: boolean;
  guided?: boolean;
}): void {
  router.push({
    pathname: '/capture',
    params: {
      ...(options?.draft ? { draft: options.draft } : {}),
      voice: options?.autoListen === false ? '0' : '1',
      ...(options?.guided ? { flow: 'guided' } : {}),
    },
  });
}

export function openGuidedVoiceCapture(): void {
  openVoiceCapture({ guided: true, autoListen: false });
}

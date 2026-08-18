import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Platform } from 'react-native';

import { resolveVoiceNetworkAccess } from '@/lib/services/voiceNetwork';
import { useSettingsStore } from '@/store/useSettingsStore';

export const NEPALI_OFFLINE_LOCALES = ['ne-NP', 'ne'] as const;

const GOOGLE_ONDEVICE_PACKAGES = [
  'com.google.android.as',
  'com.google.android.tts',
  'com.google.android.googlequicksearchbox',
] as const;

export type OfflineModelStatus = {
  installed: boolean;
  locale: string | null;
  servicePackage: string | null;
  canDownload: boolean;
};

function availableGooglePackages(): string[] {
  if (Platform.OS !== 'android') return [];
  try {
    const installed = ExpoSpeechRecognitionModule.getSpeechRecognitionServices?.() ?? [];
    return GOOGLE_ONDEVICE_PACKAGES.filter((pkg) => installed.includes(pkg));
  } catch {
    return [];
  }
}

function localeMatches(pool: string[], wanted: string): string | undefined {
  const n = wanted.replace(/_/g, '-').toLowerCase();
  const prefix = n.split('-')[0];
  return pool.find((item) => {
    const s = item.replace(/_/g, '-').toLowerCase();
    return s === n || s.startsWith(`${n}-`) || s === prefix || s.startsWith(`${prefix}-`);
  });
}

export async function getNepaliOfflineStatus(): Promise<OfflineModelStatus> {
  if (Platform.OS !== 'android') {
    return {
      installed: false,
      locale: null,
      servicePackage: null,
      canDownload: false,
    };
  }

  const canDownload =
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.() === true;

  const packages = ['', ...availableGooglePackages()];
  for (const pkg of packages) {
    try {
      const result = await ExpoSpeechRecognitionModule.getSupportedLocales({
        ...(pkg ? { androidRecognitionServicePackage: pkg } : {}),
      });
      const installed = result.installedLocales ?? [];
      for (const wanted of NEPALI_OFFLINE_LOCALES) {
        const hit = localeMatches(installed, wanted);
        if (hit) {
          return {
            installed: true,
            locale: hit,
            servicePackage: pkg || null,
            canDownload,
          };
        }
      }
    } catch {
      // service may not answer
    }
  }

  return {
    installed: false,
    locale: null,
    servicePackage: availableGooglePackages()[0] ?? null,
    canDownload,
  };
}

export type OfflineDownloadResult = {
  ok: boolean;
  status: 'installed' | 'download_success' | 'download_scheduled' | 'opened_dialog' | 'unavailable' | 'error';
  message: string;
};

/**
 * Ask Google Speech Services to install the on-device Nepali pack.
 * Google does not allow shipping that model inside a third-party APK;
 * this is the supported way to make it available to Yaad.
 */
export async function downloadNepaliOfflineModel(): Promise<OfflineDownloadResult> {
  if (Platform.OS !== 'android') {
    return {
      ok: false,
      status: 'unavailable',
      message: 'Offline Nepali download is only available on Android.',
    };
  }

  const already = await getNepaliOfflineStatus();
  if (already.installed) {
    return {
      ok: true,
      status: 'installed',
      message: 'Nepali offline voice is already on this phone.',
    };
  }

  if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.()) {
    return {
      ok: false,
      status: 'unavailable',
      message:
        'This phone has no on-device speech engine. Install Speech Services by Google, then try again.',
    };
  }

  let lastError = 'Could not download the Nepali offline model.';
  for (const locale of NEPALI_OFFLINE_LOCALES) {
    try {
      const result =
        await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
          locale,
        });
      useSettingsStore
        .getState()
        .setOfflineNepaliDownloadAttemptedAt(Date.now());
      const ok =
        result.status === 'download_success' ||
        result.status === 'download_scheduled' ||
        result.status === 'opened_dialog';
      const message =
        result.status === 'download_success'
          ? 'Nepali offline voice is ready. Yaad will use it without internet.'
          : result.status === 'download_scheduled'
            ? 'Nepali offline voice is downloading in the background. Keep Wi‑Fi on.'
            : result.message ||
              'Google is showing the Nepali language pack. Download it, then return to Yaad.';
      return { ok, status: result.status, message };
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : lastError;
    }
  }

  return { ok: false, status: 'error', message: lastError };
}

/** First-run / Wi‑Fi: install Google's Nepali pack so voice works offline. */
export async function ensureNepaliOfflineModel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const settings = useSettingsStore.getState();
  const wantsNepali =
    settings.voiceLanguage === 'ne' ||
    settings.voiceLanguage === 'new' ||
    settings.uiLanguage === 'ne';
  if (!wantsNepali) return;

  const status = await getNepaliOfflineStatus();
  if (status.installed) return;

  const attemptedAt = settings.offlineNepaliDownloadAttemptedAt ?? 0;
  if (Date.now() - attemptedAt < 12 * 60 * 60 * 1000) return;

  const network = await resolveVoiceNetworkAccess(
    settings.allowVoiceOnMobileData ?? false,
  );
  if (!network.allowNetwork) return;

  await downloadNepaliOfflineModel();
}

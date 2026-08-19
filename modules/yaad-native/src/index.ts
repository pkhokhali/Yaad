import { requireNativeModule, Platform } from 'expo-modules-core';

type SynthesizeResult = {
  channelId: string;
  soundUri: string;
};

export type HomeWidgetPayload = {
  brand: string;
  nextTitle: string;
  nextTime: string;
  overdueCount: number;
  todayCount: number;
  streak: number;
  summaryLine: string;
};

type YaadNativeModule = {
  synthesizeAlertSound: (
    text: string,
    localeTag: string,
    channelKey: string,
  ) => Promise<SynthesizeResult>;
  showCallAlert: (
    reminderId: string,
    title: string,
    body: string,
    spoken: string,
  ) => Promise<void>;
  openBatterySettings: () => Promise<void>;
  openOfflineSpeechSettings: () => Promise<void>;
  updateHomeWidget: (payload: HomeWidgetPayload) => Promise<void>;
};

const Native =
  Platform.OS === 'android'
    ? requireNativeModule<YaadNativeModule>('YaadNative')
    : null;

export async function synthesizeAlertSound(
  text: string,
  localeTag: string,
  channelKey: string,
): Promise<SynthesizeResult | null> {
  if (!Native) return null;
  return Native.synthesizeAlertSound(text, localeTag, channelKey);
}

export async function showCallAlert(
  reminderId: string,
  title: string,
  body: string,
  spoken: string,
): Promise<void> {
  if (!Native) return;
  await Native.showCallAlert(reminderId, title, body, spoken);
}

export async function openBatterySettings(): Promise<void> {
  if (!Native) return;
  await Native.openBatterySettings();
}

export async function openOfflineSpeechSettings(): Promise<void> {
  if (!Native) return;
  await Native.openOfflineSpeechSettings();
}

export async function updateHomeWidget(payload: HomeWidgetPayload): Promise<void> {
  if (!Native) return;
  await Native.updateHomeWidget(payload);
}

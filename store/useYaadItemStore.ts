import { create } from 'zustand';

import {
  createReminder,
  CreateReminderInput,
  deleteReminder,
  getReminderById,
  listReminders,
  markDone,
  snoozeReminder,
  updateReminder,
  UpdateReminderInput,
} from '@/lib/db/reminders';
import {
  reminderToYaadItem,
  yaadInputToLegacyCreate,
  yaadPatchToLegacyUpdate,
} from '@/lib/local/adapters';
import {
  cancelAllForReminder,
  completeWithRepeat,
  findNearestUpcoming,
  maybeAdaptUrgency,
  refreshEveningSweep,
  rescheduleOpenReminders,
  scheduleReminderNotifications,
} from '@/lib/services/notifications';
import { getStreak, recordActivity } from '@/lib/services/streak';
import { syncHomeWidget } from '@/lib/services/homeWidget';
import { deriveMissedStatus, filterByBucket } from '@/lib/utils/priority';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  CreateYaadItemInput,
  PriorityBucket,
  UpdateYaadItemInput,
  YaadItem,
} from '@/types/yaad';
import { AppSettings, Reminder } from '@/types';

type YaadItemState = {
  items: YaadItem[];
  reminders: Reminder[];
  streak: number;
  /** Initial SQLite load — do not wire to FlatList `refreshing`. */
  bootstrapping: boolean;
  /** Pull-to-refresh only. */
  isRefreshing: boolean;
  highlightId: string | null;
  ready: boolean;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  itemsForBucket: (bucket: PriorityBucket) => YaadItem[];
  addItem: (input: CreateYaadItemInput, settings: AppSettings) => Promise<YaadItem>;
  addReminder: (
    input: CreateReminderInput,
    settings: AppSettings,
  ) => Promise<Reminder>;
  editItem: (
    id: string,
    input: UpdateYaadItemInput,
    settings: AppSettings,
  ) => Promise<void>;
  editReminder: (
    id: string,
    input: UpdateReminderInput,
    settings: AppSettings,
  ) => Promise<void>;
  completeItem: (id: string, settings: AppSettings) => Promise<void>;
  completeReminder: (id: string, settings: AppSettings) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  snooze: (
    id: string,
    minutes: number,
    settings: AppSettings,
  ) => Promise<void>;
  toggleChecklistItem: (id: string, index: number) => Promise<void>;
  getById: (id: string) => Promise<Reminder | null>;
};

function syncFromReminders(reminders: Reminder[]): {
  items: YaadItem[];
  reminders: Reminder[];
  highlightId: string | null;
} {
  const items = deriveMissedStatus(reminders.map(reminderToYaadItem));
  return {
    items,
    reminders,
    highlightId: findNearestUpcoming(reminders),
  };
}

export const useYaadItemStore = create<YaadItemState>((set, get) => ({
  items: [],
  reminders: [],
  streak: 0,
  bootstrapping: false,
  isRefreshing: false,
  highlightId: null,
  ready: false,

  bootstrap: async () => {
    if (get().ready || get().bootstrapping) return;
    set({ bootstrapping: true });
    try {
      const [allReminders, streak] = await Promise.all([
        listReminders(),
        getStreak(),
      ]);
      const synced = syncFromReminders(allReminders);
      set({
        ...synced,
        streak,
        bootstrapping: false,
        ready: true,
      });
      await syncHomeWidget(allReminders);
      await rescheduleOpenReminders(
        useSettingsStore.getState().getSettings(),
      ).catch(() => undefined);
    } finally {
      set({ bootstrapping: false });
    }
  },

  refresh: async () => {
    if (get().bootstrapping || get().isRefreshing) return;
    set({ isRefreshing: true });
    try {
      const [allReminders, streak] = await Promise.all([
        listReminders(),
        getStreak(),
      ]);
      const synced = syncFromReminders(allReminders);
      set({ ...synced, streak });
      await syncHomeWidget(allReminders);
    } finally {
      set({ isRefreshing: false });
    }
  },

  itemsForBucket: (bucket) => filterByBucket(get().items, bucket),

  addItem: async (input, settings) => {
    const reminder = await createReminder({
      ...yaadInputToLegacyCreate(input),
      urgency_curve: settings.defaultUrgencyCurve,
    });
    await scheduleReminderNotifications(reminder, settings);
    await recordActivity();
    await get().refresh();
    return reminderToYaadItem(reminder);
  },

  addReminder: async (input, settings) => {
    const reminder = await createReminder({
      ...input,
      urgency_curve: input.urgency_curve ?? settings.defaultUrgencyCurve,
    });
    await scheduleReminderNotifications(reminder, settings);
    await recordActivity();
    await get().refresh();
    return reminder;
  },

  editItem: async (id, input, settings) => {
    await updateReminder(id, yaadPatchToLegacyUpdate(input));
    const reminder = await getReminderById(id);
    if (reminder) {
      await scheduleReminderNotifications(reminder, settings);
    }
    await get().refresh();
  },

  editReminder: async (id, input, settings) => {
    await updateReminder(id, input);
    const reminder = await getReminderById(id);
    if (reminder) {
      await scheduleReminderNotifications(reminder, settings);
    }
    await get().refresh();
  },

  completeItem: async (id, settings) => {
    await get().completeReminder(id, settings);
  },

  completeReminder: async (id, settings) => {
    const reminder = await getReminderById(id);
    if (!reminder) return;
    if (reminder.repeat_rule) {
      await completeWithRepeat(reminder, settings);
    } else {
      await markDone(id);
      await cancelAllForReminder(id);
      await refreshEveningSweep(settings);
    }
    await recordActivity();
    await get().refresh();
  },

  removeItem: async (id) => {
    await get().removeReminder(id);
  },

  removeReminder: async (id) => {
    await cancelAllForReminder(id);
    await deleteReminder(id);
    await refreshEveningSweep(useSettingsStore.getState().getSettings());
    await get().refresh();
  },

  snooze: async (id, minutes, settings) => {
    await snoozeReminder(id, minutes);
    await maybeAdaptUrgency(id);
    const reminder = await getReminderById(id);
    if (reminder) {
      await scheduleReminderNotifications(reminder, settings);
    }
    await get().refresh();
  },

  getById: async (id) => getReminderById(id),

  toggleChecklistItem: async (id, index) => {
    const reminder = await getReminderById(id);
    if (!reminder?.items || !reminder.items[index]) return;
    const items = reminder.items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item,
    );
    await updateReminder(id, { items });
    await get().refresh();
  },
}));

export const useReminderStore = useYaadItemStore;

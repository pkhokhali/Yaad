import { create } from 'zustand';

import {
  createMoneyEntry,
  deleteMoneyEntry,
  listMoneyEntries,
  monthTotals,
} from '@/lib/db/money';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  CreateMoneyInput,
  MoneyEntry,
  MonthMoneyTotals,
} from '@/types/money';

type MoneyState = {
  entries: MoneyEntry[];
  month: MonthMoneyTotals;
  ready: boolean;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  addEntry: (input: CreateMoneyInput) => Promise<MoneyEntry>;
  removeEntry: (id: string) => Promise<void>;
};

export const useMoneyStore = create<MoneyState>((set) => ({
  entries: [],
  month: { expenseOffice: 0, expensePersonal: 0, lendTotal: 0 },
  ready: false,

  bootstrap: async () => {
    const calendar = useSettingsStore.getState().calendarDisplay ?? 'both';
    const [entries, month] = await Promise.all([
      listMoneyEntries(),
      monthTotals(new Date(), calendar),
    ]);
    set({ entries, month, ready: true });
  },

  refresh: async () => {
    const calendar = useSettingsStore.getState().calendarDisplay ?? 'both';
    const [entries, month] = await Promise.all([
      listMoneyEntries(),
      monthTotals(new Date(), calendar),
    ]);
    set({ entries, month });
  },

  addEntry: async (input) => {
    const entry = await createMoneyEntry(input);
    const calendar = useSettingsStore.getState().calendarDisplay ?? 'both';
    const month = await monthTotals(new Date(), calendar);
    set((state) => ({
      entries: [entry, ...state.entries],
      month,
    }));
    return entry;
  },

  removeEntry: async (id) => {
    await deleteMoneyEntry(id);
    const calendar = useSettingsStore.getState().calendarDisplay ?? 'both';
    const month = await monthTotals(new Date(), calendar);
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      month,
    }));
  },
}));

import { create } from 'zustand';

import {
  createMoneyEntry,
  deleteMoneyEntry,
  listMoneyEntries,
  monthTotals,
} from '@/lib/db/money';
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
    const [entries, month] = await Promise.all([
      listMoneyEntries(),
      monthTotals(),
    ]);
    set({ entries, month, ready: true });
  },

  refresh: async () => {
    const [entries, month] = await Promise.all([
      listMoneyEntries(),
      monthTotals(),
    ]);
    set({ entries, month });
  },

  addEntry: async (input) => {
    const entry = await createMoneyEntry(input);
    const month = await monthTotals();
    set((state) => ({
      entries: [entry, ...state.entries],
      month,
    }));
    return entry;
  },

  removeEntry: async (id) => {
    await deleteMoneyEntry(id);
    const month = await monthTotals();
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      month,
    }));
  },
}));

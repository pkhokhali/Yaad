export type MoneyKind = 'expense' | 'lend';
export type ExpenseLedger = 'office' | 'personal';
export type MoneyStatus = 'pending' | 'settled';

export interface MoneyEntry {
  id: string;
  kind: MoneyKind;
  title: string;
  amount: number;
  ledger: ExpenseLedger;
  person: string | null;
  status: MoneyStatus;
  entry_date: number;
  notes: string | null;
  created_at: number;
}

export type CreateMoneyInput = {
  kind: MoneyKind;
  title: string;
  amount: number;
  ledger?: ExpenseLedger;
  person?: string | null;
  status?: MoneyStatus;
  entry_date?: number;
  notes?: string | null;
};

export interface MonthMoneyTotals {
  expenseOffice: number;
  expensePersonal: number;
  lendTotal: number;
}

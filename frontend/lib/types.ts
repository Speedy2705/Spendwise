export type Expense = {
  id: number;
  amount: string;
  category: string;
  description: string;
  date: string;
  created_at: string;
};

export type ExpenseListResponse = {
  expenses: Expense[];
  total: string;
};

export type ExpenseCreatePayload = {
  amount: string;
  category: string;
  description: string;
  date: string;
};

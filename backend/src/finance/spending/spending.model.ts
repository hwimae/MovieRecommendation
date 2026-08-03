export type SpendingExpense = {
  amount: number;
  category: { id: string; name: string } | null;
};

export type SpendingSummary = {
  totalAmount: number;
  categories: Array<{ categoryId: string | null; categoryName: string; amount: number }>;
};

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function summarizeExpenses(expenses: SpendingExpense[]): SpendingSummary {
  const totals = new Map<string, { categoryId: string | null; categoryName: string; amountCents: number }>();
  let totalCents = 0;

  for (const expense of expenses) {
    const cents = toCents(expense.amount);
    totalCents += cents;
    const categoryId = expense.category?.id ?? null;
    const key = categoryId ?? 'uncategorized';
    const current = totals.get(key) ?? {
      categoryId,
      categoryName: expense.category?.name ?? 'Chưa phân loại',
      amountCents: 0,
    };
    current.amountCents += cents;
    totals.set(key, current);
  }

  return {
    totalAmount: totalCents / 100,
    categories: [...totals.values()]
      .map(({ categoryId, categoryName, amountCents }) => ({ categoryId, categoryName, amount: amountCents / 100 }))
      .sort((a, b) => b.amount - a.amount),
  };
}

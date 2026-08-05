import React from "react";

import type { FinanceCategory, FinanceExpense } from "../../types/finance";
import { CardSurface } from "../ui";
import { formatFinanceDate, formatFinanceMoney } from "./finance-format";

type RecentTransactionsProps = {
  expenses: FinanceExpense[];
  categories: FinanceCategory[];
};

export function RecentTransactions({
  expenses,
  categories,
}: RecentTransactionsProps) {
  const categoryMap = categories.reduce<Record<string, FinanceCategory>>(
    (acc, category) => {
      acc[category.id] = category;
      return acc;
    },
    {},
  );

  const recentExpenses = [...expenses]
    .sort(
      (a, b) =>
        new Date(b.spentAt ?? 0).getTime() - new Date(a.spentAt ?? 0).getTime(),
    )
    .slice(0, 10);
  const summaryCount = recentExpenses.length;

  return (
    <CardSurface
      as="article"
      className="section-stack glass-card finance-transactions-card"
    >
      <header className="section-heading-row">
        <div className="section-stack">
          <p className="eyebrow">GIAO DỊCH</p>
          <h2>Giao dịch gần đây</h2>
          <p>10 khoản chi mới nhất đã được ghi nhận.</p>
        </div>
      </header>

      {recentExpenses.length === 0 ? (
        <p>Chưa có giao dịch nào.</p>
      ) : (
        <ul className="finance-transaction-list">
          {recentExpenses.map((expense) => {
            const category =
              expense.category ??
              (expense.categoryId
                ? categoryMap[expense.categoryId]
                : undefined);
            const merchantName =
              expense.merchantName || expense.description || "Không rõ";
            const avatarTint = category?.color
              ? `${category.color}22`
              : undefined;

            return (
              <li key={expense.id} className="finance-transaction-row">
                <div
                  className="finance-transaction-avatar"
                  style={{
                    backgroundColor: avatarTint,
                    color: category?.color ?? undefined,
                  }}
                  aria-hidden="true"
                >
                  {category?.icon || merchantName.slice(0, 1).toUpperCase()}
                </div>
                <div className="finance-transaction-main finance-transaction-copy">
                  <h3>{merchantName}</h3>
                  <p>
                    {formatFinanceDate(expense.spentAt)} ·{" "}
                    {category?.name || "Khác"}
                  </p>
                </div>
                <strong className="finance-transaction-amount">
                  -{formatFinanceMoney(expense.amount)}
                </strong>
              </li>
            );
          })}
        </ul>
      )}
    </CardSurface>
  );
}

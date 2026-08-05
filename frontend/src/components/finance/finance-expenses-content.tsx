import React from "react";

import {
  Button,
  CardSurface,
  Chip,
  DataTable,
  EmptyState,
  FormField,
  SegmentedFilter,
  StatCard,
  type DataTableColumn,
} from "../ui";
import type { FinanceCategory, FinanceExpense } from "../../types/finance";
import {
  formatFinanceAmountInput,
  formatFinanceDate,
  formatFinanceMoney,
} from "./finance-format";
import type { FinanceExpenseHighlights } from "./finance-expenses-summary";

export type FinanceExpenseDraft = {
  merchantName: string;
  description: string;
  amount: string;
  categoryId: string;
  spentAt: string;
};

export type FinanceSubmitMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

export type FinanceExpensesContentProps = {
  categories: FinanceCategory[];
  highlights: FinanceExpenseHighlights;
  draft: FinanceExpenseDraft;
  isSubmitting: boolean;
  submitMessage: FinanceSubmitMessage | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDraftChange: (patch: Partial<FinanceExpenseDraft>) => void;
};

const HISTORY_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
];

export function FinanceExpensesContent({
  categories,
  highlights,
  draft,
  isSubmitting,
  submitMessage,
  onSubmit,
  onDraftChange,
}: FinanceExpensesContentProps) {
  const highestExpenseLabel = highlights.highestExpense
    ? `${highlights.highestExpense.merchantName || "Không rõ"} (${formatFinanceMoney(highlights.highestExpense.amount)})`
    : "Chưa có dữ liệu";

  const topCategoryLabel = highlights.topCategory
    ? `${highlights.topCategory.label} (${formatFinanceMoney(highlights.topCategory.amount)})`
    : "Chưa có dữ liệu";

  const categoryOptions = [
    { value: "", label: "Chưa phân loại" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const columns: DataTableColumn<FinanceExpense>[] = [
    {
      key: "spentAt",
      header: "Ngày",
      render: (expense) => formatFinanceDate(expense.spentAt),
    },
    {
      key: "merchant",
      header: "Nơi chi / Mô tả",
      render: (expense) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">
            {expense.merchantName || "Không rõ"}
          </span>
          <span className="text-xs text-textMuted">
            {expense.description || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Danh mục",
      render: (expense) => {
        const category =
          expense.category ??
          (expense.categoryId
            ? highlights.categoryMap[expense.categoryId]
            : undefined);

        return <Chip tone="primary">{category?.name || "Khác"}</Chip>;
      },
    },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      render: (expense) => formatFinanceMoney(expense.amount),
    },
  ];

  return (
    <section className="flex flex-col gap-5">
      <CardSurface as="section" aria-label="Tổng quan chi tiêu" padding="lg">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">
            Tổng chi tiêu tháng này
          </h2>
          <p className="text-3xl font-bold tabular-nums text-text">
            {formatFinanceMoney(highlights.totalAmount)}
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard label="Cao nhất" value={highestExpenseLabel} />
          <StatCard label="Danh mục chính" value={topCategoryLabel} />
        </div>
      </CardSurface>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CardSurface
          as="form"
          onSubmit={onSubmit}
          title="Thêm khoản chi mới"
          description="Ghi nhanh giao dịch thủ công và giữ lịch sử chi tiêu của bạn luôn cập nhật."
          padding="lg"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="expense-merchant"
              label="Nơi chi"
              value={draft.merchantName}
              onChange={(event) =>
                onDraftChange({ merchantName: event.target.value })
              }
            />

            <FormField
              id="expense-amount"
              label="Số tiền (VNĐ)"
              hint="Nhập số, hệ thống tự chèn dấu phân cách"
              required
              type="text"
              inputMode="numeric"
              placeholder="Ví dụ: 1.250.000"
              value={draft.amount}
              onChange={(event) =>
                onDraftChange({
                  amount: formatFinanceAmountInput(event.target.value),
                })
              }
            />

            <FormField
              kind="select"
              id="expense-category"
              label="Danh mục"
              value={draft.categoryId}
              onValueChange={(categoryId) => onDraftChange({ categoryId })}
              options={categoryOptions}
            />

            <FormField
              id="expense-spent-at"
              label="Thời gian"
              type="datetime-local"
              value={draft.spentAt}
              onChange={(event) =>
                onDraftChange({ spentAt: event.target.value })
              }
            />

            <div className="sm:col-span-2">
              <FormField
                kind="textarea"
                id="expense-description"
                label="Mô tả chi tiết"
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  onDraftChange({ description: event.target.value })
                }
              />
            </div>
          </div>

          {submitMessage ? (
            <div className="mt-4">
              <EmptyState
                tone={submitMessage.tone}
                title={submitMessage.text}
              />
            </div>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              Thêm khoản chi
            </Button>
          </div>
        </CardSurface>

        <CardSurface
          as="aside"
          aria-label="Khu vực AI phân tích"
          title="AI Phân tích"
          description="Khu vực AI phân tích sẽ được bổ sung sau. Hiện tại card này giữ chỗ để bám layout của workspace Chi tiêu."
          padding="lg"
        >
          <Button variant="secondary" isDisabled>
            Xem báo cáo chi tiết
          </Button>
        </CardSurface>
      </div>

      <CardSurface
        as="section"
        aria-label="Lịch sử chi tiêu"
        title="Lịch sử chi tiêu"
        action={
          <SegmentedFilter
            items={HISTORY_FILTERS}
            activeKey="all"
            isDisabled
            ariaLabel="Bộ lọc lịch sử chi tiêu"
          />
        }
        padding="lg"
      >
        <DataTable
          caption="Lịch sử các khoản chi trong tháng"
          columns={columns}
          rows={highlights.sortedExpenses}
          getRowKey={(expense) => expense.id}
          emptyContent={
            <EmptyState
              title="Chưa có khoản chi nào."
              description="Thêm khoản chi đầu tiên ở form phía trên để bắt đầu theo dõi."
            />
          }
        />
      </CardSurface>
    </section>
  );
}

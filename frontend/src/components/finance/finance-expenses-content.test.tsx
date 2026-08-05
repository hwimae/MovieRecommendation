import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { FinanceCategory } from "../../types/finance";
import { buildFinanceExpenseHighlights } from "./finance-expenses-summary";
import {
  FinanceExpensesContent,
  type FinanceExpenseDraft,
} from "./finance-expenses-content";

const categories: FinanceCategory[] = [
  { id: "food", name: "Ăn uống" },
  { id: "home", name: "Nhà cửa" },
];

const draft: FinanceExpenseDraft = {
  merchantName: "",
  description: "",
  amount: "",
  categoryId: "",
  spentAt: "",
};

describe("FinanceExpensesContent", () => {
  it("renders the redesigned hero, form, AI placeholder, and history table", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [
        {
          id: "expense-1",
          amount: 850_000,
          merchantName: "Tiền điện",
          description: "Qua ví điện tử",
          spentAt: "2026-06-21T08:00:00.000Z",
          categoryId: "home",
        },
      ],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={null}
        onSubmit={(event) => event.preventDefault()}
        onDraftChange={vi.fn()}
      />,
    );

    expect(html).toContain("Tổng chi tiêu tháng này");
    expect(html).toContain("Cao nhất");
    expect(html).toContain("Danh mục chính");
    expect(html).toContain("Thêm khoản chi mới");
    expect(html).toContain("AI Phân tích");
    expect(html).toContain("Khu vực AI phân tích sẽ được bổ sung sau");
    expect(html).toContain("Lịch sử chi tiêu");
    expect(html).toContain("Tiền điện");
    expect(html).toContain("disabled");
  });

  it("renders fallbacks when there are no expenses yet", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={null}
        onSubmit={(event) => event.preventDefault()}
        onDraftChange={vi.fn()}
      />,
    );

    expect(html).toContain("Chưa có dữ liệu");
    expect(html).toContain("Chưa có khoản chi nào.");
  });

  it("renders a text money input with numeric keyboard hint", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={{ ...draft, amount: "1.250.000" }}
        isSubmitting={false}
        submitMessage={null}
        onSubmit={(event) => event.preventDefault()}
        onDraftChange={vi.fn()}
      />,
    );

    expect(html).toContain('id="expense-amount"');
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('value="1.250.000"');
    expect(html).toContain('placeholder="Ví dụ: 1.250.000"');
  });

  it("hiện thông báo thử-lại với tone info, không phải error", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={{
          tone: "info",
          text: "Hệ thống đang chậm, đang tải lại dữ liệu chi tiêu...",
        }}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain(
      "Hệ thống đang chậm, đang tải lại dữ liệu chi tiêu...",
    );
    expect(html).toContain('data-tone="info"');
    expect(html).not.toContain('data-tone="error"');
  });

  it("hiện thông báo thành công với tone success", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={{ tone: "success", text: "Đã thêm khoản chi mới." }}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain('data-tone="success"');
  });

  it("dùng primitive cho form, bảng và chip, không còn control thô", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [
        {
          id: "expense-1",
          amount: 850_000,
          merchantName: "Tiền điện",
          description: "Qua ví điện tử",
          spentAt: "2026-06-21T08:00:00.000Z",
          categoryId: "home",
        },
      ],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={null}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain('data-testid="stat-card"');
    expect(html).toContain('data-testid="form-field"');
    expect(html).toContain('data-testid="data-table"');
    expect(html).toContain('data-testid="segmented-filter"');
    expect(html).toContain('data-testid="chip"');
    expect(html).not.toContain("finance-expenses-summary-card");
    expect(html).not.toContain("finance-expenses-category-pill");
    expect(html).not.toContain("finance-expenses-filter");
  });

  it("hiện EmptyState khi chưa có khoản chi", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={null}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain('data-testid="empty-state"');
    expect(html).toContain("Chưa có khoản chi nào.");
    expect(html).not.toContain("<table");
  });
});

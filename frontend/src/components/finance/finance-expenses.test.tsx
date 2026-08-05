import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FinanceExpenses } from "./finance-expenses";

describe("FinanceExpenses", () => {
  it("renders the loading container before data resolves", () => {
    const html = renderToStaticMarkup(<FinanceExpenses />);

    expect(html).toContain("Đang tải chi tiêu...");
    expect(html).toContain('data-testid="empty-state"');
  });
});

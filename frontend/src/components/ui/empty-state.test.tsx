import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("render title và data-testid", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Chưa có khoản chi nào." />,
    );

    expect(html).toContain('data-testid="empty-state"');
    expect(html).toContain("Chưa có khoản chi nào.");
  });

  it("dùng role=status cho tone info", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Đang tải chi tiêu..." />,
    );

    expect(html).toContain('role="status"');
  });

  it("dùng role=alert cho tone error", () => {
    const html = renderToStaticMarkup(
      <EmptyState tone="error" title="Không thể tải chi tiêu." />,
    );

    expect(html).toContain('role="alert"');
  });

  it("render description và action", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Chưa có khoản chi nào."
        description="Thêm khoản chi đầu tiên để bắt đầu theo dõi."
        action={<button type="button">Thêm khoản chi</button>}
      />,
    );

    expect(html).toContain("Thêm khoản chi đầu tiên để bắt đầu theo dõi.");
    expect(html).toContain("Thêm khoản chi");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CardSurface } from "./card-surface";

describe("CardSurface", () => {
  it("render children và data-testid", () => {
    const html = renderToStaticMarkup(
      <CardSurface>
        <p>Nội dung thẻ</p>
      </CardSurface>,
    );

    expect(html).toContain('data-testid="card-surface"');
    expect(html).toContain("Nội dung thẻ");
  });

  it("không render vùng header khi không có title/description/action", () => {
    const html = renderToStaticMarkup(<CardSurface>Chỉ có ruột</CardSurface>);

    expect(html).not.toContain('data-testid="card-surface-header"');
  });

  it("render title, description và action khi được truyền", () => {
    const html = renderToStaticMarkup(
      <CardSurface
        title="Thêm khoản chi mới"
        description="Ghi nhanh giao dịch thủ công."
        action={<span>Bộ lọc</span>}
      >
        Ruột
      </CardSurface>,
    );

    expect(html).toContain('data-testid="card-surface-header"');
    expect(html).toContain("Thêm khoản chi mới");
    expect(html).toContain("Ghi nhanh giao dịch thủ công.");
    expect(html).toContain("Bộ lọc");
  });

  it("giữ className do call site truyền vào", () => {
    const html = renderToStaticMarkup(
      <CardSurface className="auth-card">Ruột</CardSurface>,
    );

    expect(html).toContain("auth-card");
  });

  it("render thành thẻ form khi as=form", () => {
    const html = renderToStaticMarkup(
      <CardSurface as="form">
        <input name="amount" />
      </CardSurface>,
    );

    expect(html).toContain("<form");
  });

  it("render thành thẻ section và giữ aria-label", () => {
    const html = renderToStaticMarkup(
      <CardSurface as="section" aria-label="Lịch sử chi tiêu">
        Ruột
      </CardSurface>,
    );

    expect(html).toContain("<section");
    expect(html).toContain('aria-label="Lịch sử chi tiêu"');
  });

  it("render thành thẻ aside", () => {
    const html = renderToStaticMarkup(
      <CardSurface as="aside" aria-label="Khu vực AI phân tích">
        Ruột
      </CardSurface>,
    );

    expect(html).toContain("<aside");
  });

  it("render thành thẻ article", () => {
    const html = renderToStaticMarkup(
      <CardSurface as="article">Ruột</CardSurface>,
    );

    expect(html).toContain("<article");
  });

  it("body mặc định có gap-4 khi không truyền bodyClassName", () => {
    const html = renderToStaticMarkup(<CardSurface>Ruột</CardSurface>);

    expect(html).toContain("gap-4");
  });

  it("bodyClassName thay thế hoàn toàn gap mặc định", () => {
    const html = renderToStaticMarkup(
      <CardSurface bodyClassName="gap-1">Ruột</CardSurface>,
    );

    expect(html).toContain("gap-1");
    expect(html).not.toContain("gap-4");
  });
});

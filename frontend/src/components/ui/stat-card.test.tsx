import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("render label, value và data-testid", () => {
    const html = renderToStaticMarkup(
      <StatCard label="Cao nhất" value="1.250.000 ₫" />,
    );

    expect(html).toContain('data-testid="stat-card"');
    expect(html).toContain("Cao nhất");
    expect(html).toContain("1.250.000 ₫");
  });

  it("render delta khi được truyền", () => {
    const html = renderToStaticMarkup(
      <StatCard
        label="Tổng chi"
        value="12.480.000 ₫"
        delta="Giảm 8% so với tháng trước"
      />,
    );

    expect(html).toContain("Giảm 8% so với tháng trước");
  });

  it("phơi tone ra data-tone", () => {
    const html = renderToStaticMarkup(
      <StatCard label="Cao nhất" value="1 ₫" tone="warning" />,
    );

    expect(html).toContain('data-tone="warning"');
  });
});

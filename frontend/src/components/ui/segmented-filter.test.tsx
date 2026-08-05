import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SegmentedFilter } from "./segmented-filter";

const items = [
  { key: "all", label: "Tất cả" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
];

describe("SegmentedFilter", () => {
  it("render mọi item và data-testid", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter
        items={items}
        activeKey="all"
        ariaLabel="Bộ lọc lịch sử chi tiêu"
      />,
    );

    expect(html).toContain('data-testid="segmented-filter"');
    expect(html).toContain("Tất cả");
    expect(html).toContain("Tuần này");
    expect(html).toContain("Tháng này");
  });

  it("gắn aria-current cho đúng một item đang chọn", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter
        items={items}
        activeKey="week"
        ariaLabel="Bộ lọc lịch sử chi tiêu"
      />,
    );

    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("gắn aria-label cho nhóm", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter
        items={items}
        activeKey="all"
        ariaLabel="Bộ lọc lịch sử chi tiêu"
      />,
    );

    expect(html).toContain('aria-label="Bộ lọc lịch sử chi tiêu"');
  });
});

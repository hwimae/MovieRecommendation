import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Chip } from "./chip";

describe("Chip", () => {
  it("render nội dung và data-testid", () => {
    const html = renderToStaticMarkup(<Chip>Ăn uống</Chip>);

    expect(html).toContain('data-testid="chip"');
    expect(html).toContain("Ăn uống");
  });

  it("mặc định tone neutral", () => {
    const html = renderToStaticMarkup(<Chip>Khác</Chip>);

    expect(html).toContain('data-tone="neutral"');
  });

  it("phơi tone ra data-tone cho từng tone", () => {
    for (const tone of ["neutral", "primary", "success", "warning", "danger", "info"] as const) {
      const html = renderToStaticMarkup(<Chip tone={tone}>Nhãn</Chip>);

      expect(html).toContain(`data-tone="${tone}"`);
    }
  });
});

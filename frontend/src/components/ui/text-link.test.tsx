import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TextLink } from "./text-link";

describe("TextLink", () => {
  it("render href, nhãn và data-testid", () => {
    const html = renderToStaticMarkup(<TextLink href="/stories">Khu Truyện</TextLink>);

    expect(html).toContain('data-testid="text-link"');
    expect(html).toContain('href="/stories"');
    expect(html).toContain("Khu Truyện");
  });

  it("mặc định tone primary", () => {
    const html = renderToStaticMarkup(<TextLink href="/">Trang chủ</TextLink>);

    expect(html).toContain('data-tone="primary"');
  });

  it("nhận tone muted", () => {
    const html = renderToStaticMarkup(
      <TextLink href="/" tone="muted">
        Trang chủ
      </TextLink>,
    );

    expect(html).toContain('data-tone="muted"');
  });
});

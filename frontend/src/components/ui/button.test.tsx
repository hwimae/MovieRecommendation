import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("render nhãn và data-testid", () => {
    const html = renderToStaticMarkup(<Button>Thêm khoản chi</Button>);

    expect(html).toContain('data-testid="button"');
    expect(html).toContain("Thêm khoản chi");
  });

  it("mặc định là variant primary", () => {
    const html = renderToStaticMarkup(<Button>Lưu</Button>);

    expect(html).toContain('data-variant="primary"');
  });

  it("giữ nguyên nhãn và đặt aria-busy khi đang loading", () => {
    const html = renderToStaticMarkup(
      <Button isLoading>Thêm khoản chi</Button>,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Thêm khoản chi");
  });

  it("không đặt aria-busy khi không loading", () => {
    const html = renderToStaticMarkup(<Button>Thêm khoản chi</Button>);

    expect(html).not.toContain("aria-busy");
  });

  it("phơi variant ra data-variant cho từng biến thể", () => {
    for (const variant of [
      "primary",
      "secondary",
      "ghost",
      "danger",
    ] as const) {
      const html = renderToStaticMarkup(<Button variant={variant}>Nút</Button>);

      expect(html).toContain(`data-variant="${variant}"`);
    }
  });

  it("giữ className do call site truyền vào", () => {
    const html = renderToStaticMarkup(
      <Button className="global-header-auth-button">Nút</Button>,
    );

    expect(html).toContain("global-header-auth-button");
  });

  it("render thành thẻ a khi truyền as", () => {
    const html = renderToStaticMarkup(
      <Button as="a" href="/stories">
        Xem truyện
      </Button>,
    );

    expect(html).toContain("<a");
    expect(html).toContain('href="/stories"');
  });
});

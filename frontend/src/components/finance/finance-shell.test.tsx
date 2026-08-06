import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function renderShellAtPath(pathname: string, content: string) {
  vi.resetModules();
  vi.doMock("next/navigation", () => ({
    usePathname: () => pathname,
  }));

  const { FinanceShell } = await import("./finance-shell");

  return renderToStaticMarkup(
    <FinanceShell>
      <section>
        <p>{content}</p>
      </section>
    </FinanceShell>,
  );
}

describe("FinanceShell", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("renders finance routes without the duplicated intro card", async () => {
    const html = await renderShellAtPath("/finance/dashboard", "Nội dung dashboard");

    expect(html).toContain("Tài chính cá nhân");
    expect(html).toContain("Điều hướng tài chính");
    expect(html).not.toContain("Khu tài chính");
    expect(html).not.toContain("Finance workspace");
    expect(html).not.toContain("Theo dõi chi tiêu, ngân sách và các danh mục tài chính của bạn.");
    expect(html).not.toContain("page-header");
    expect(html).toContain('class="sr-only"');
    expect(html).toContain("Nội dung dashboard");
    expect(html).not.toContain("finance-shell-layout");
    expect(html).toContain("finance-shell-frame");
    expect(html).toContain("finance-shell-nav-row");
    expect(html).toContain("finance-shell-content");
  });

  it("renders the groups route with the same horizontal finance nav", async () => {
    const html = await renderShellAtPath("/finance/groups", "Nội dung nhóm");

    expect(html).toContain("Nhóm tài chính");
    expect(html).toContain("finance-nav");
    expect(html).not.toContain("finance-nav-rail");
    expect(html).not.toContain("finance-shell-layout");
    expect(html).toContain("Nội dung nhóm");
  });
});

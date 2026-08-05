import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/components/ui/form-field", () => ({
  FormField: ({ label }: { label: string }) => React.createElement("div", null, label),
}));

vi.mock("@/components/ui", () => ({
  CardSurface: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "card-surface" }, children),
  Button: ({ children }: { children: React.ReactNode }) =>
    React.createElement("button", null, children),
}));

vi.mock("@/components/ui/page-shell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => React.createElement("main", null, children),
}));

vi.mock("@/components/ui/status-message", () => ({
  StatusMessage: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

vi.mock("@/lib/api", () => ({
  apiPost: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  parseRegisterResponse: (input: unknown) => input,
}));

import RegisterPage from "./page";

describe("RegisterPage", () => {
  it("renders the register form inside the shared form surface", () => {
    const html = renderToStaticMarkup(<RegisterPage />);
    expect(html).toContain('data-testid="card-surface"');
    expect(html).toContain("Tạo tài khoản mới");
  });
});

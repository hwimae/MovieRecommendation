import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const searchParamsState = { value: "" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("@/components/auth/auth-routing", () => ({
  AUTH_REQUIRED_REDIRECT_REASON: "auth-required",
}));

vi.mock("@/components/ui/form-field", () => ({
  FormField: ({ label }: { label: string }) => React.createElement("div", null, label),
}));

vi.mock("@/components/ui", () => ({
  CardSurface: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "card-surface" }, children),
}));

vi.mock("@/components/ui/page-shell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => React.createElement("main", null, children),
}));

vi.mock("@/components/ui/status-message", () => ({
  StatusMessage: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  apiPost: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  parseAuthResponse: (input: unknown) => input,
  saveAccessToken: vi.fn(),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("shows the auth-required notice only for redirected guests", () => {
    searchParamsState.value = "redirectReason=auth-required";
    const redirectedHtml = renderToStaticMarkup(<LoginPage />);
    expect(redirectedHtml).toContain("Bạn cần đăng nhập để tiếp tục.");

    searchParamsState.value = "";
    const directHtml = renderToStaticMarkup(<LoginPage />);
    expect(directHtml).not.toContain("Bạn cần đăng nhập để tiếp tục.");
  });
});

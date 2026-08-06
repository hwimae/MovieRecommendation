import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockedPathname = "/finance/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

let mockedUser: unknown = null;
let mockedIsCheckingAuth = false;
let mockedIsRefreshingAuth = false;
const mockedLogout = vi.fn();

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: mockedUser,
    isCheckingAuth: mockedIsCheckingAuth,
    isRefreshingAuth: mockedIsRefreshingAuth,
    logout: mockedLogout,
  }),
}));

import { GlobalHeader } from "./global-header";

describe("GlobalHeader", () => {
  beforeEach(() => {
    mockedPathname = "/finance/dashboard";
    mockedUser = null;
    mockedIsCheckingAuth = false;
    mockedIsRefreshingAuth = false;
    mockedLogout.mockClear();
  });

  it("renders the header shell with neutral nav links and auth actions", () => {
    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain("Hwimae");
    expect(html).toContain("global-header-shell");
    expect(html).not.toContain("global-header-topbar");
    expect(html).toContain("global-header-module-rail");
    expect(html).toContain("global-header-nav-link");
    expect(html).toContain("global-header-auth-button");
    expect(html).toContain("global-header-auth-actions");
    expect(html).toContain('href="/finance/dashboard"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/register"');
    expect(html).not.toContain('href="/admin/users"');
  });

  it("keeps the finance tab active across finance sub-pages", () => {
    mockedPathname = "/finance/groups";

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain('href="/finance/dashboard"');
    expect(html).toContain('aria-current="page"');
  });

  it("shows logout actions for authenticated users", () => {
    mockedPathname = "/finance/dashboard";
    mockedUser = {
      id: "user1",
      email: "user@example.com",
      name: "User",
      role: "USER",
      status: "APPROVED",
    };

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain("Đăng xuất");
    expect(html).toContain("User");
    expect(html).toContain("global-header-account-name");
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/register"');
  });

  it("keeps auth actions visible during background auth refresh", () => {
    mockedUser = {
      id: "user1",
      email: "user@example.com",
      name: "User",
      role: "USER",
      status: "APPROVED",
    };
    mockedIsCheckingAuth = false;
    mockedIsRefreshingAuth = true;

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain("Đăng xuất");
    expect(html).toContain("User");
  });

  it("shows the admin entry for approved admins", () => {
    mockedPathname = "/finance/dashboard";
    mockedUser = {
      id: "admin1",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      status: "APPROVED",
    };

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain('href="/admin/users"');
    expect(html).toContain("Admin");
    expect(html).toContain("Đăng xuất");
  });
});

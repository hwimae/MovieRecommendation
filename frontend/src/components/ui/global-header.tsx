"use client";

import { Button, Link as HeroLink } from "@heroui/react";
import { CircleUserRound } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { useAuth } from "@/components/auth/auth-context";

const MODULE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/stories", label: "Truyện" },
  { href: "/finance/dashboard", label: "Tài chính" },
  { href: "/movie", label: "Phim" },
] as const;

const STORY_PATH_PREFIXES = ["/stories", "/recommendations", "/login", "/register"];

function isModuleActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/finance/dashboard") {
    return pathname === "/finance" || pathname.startsWith("/finance/");
  }

  if (href === "/stories") {
    return STORY_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GlobalHeader() {
  const pathname = usePathname();
  const { user, isCheckingAuth, isRefreshingAuth, logout } = useAuth();
  const links =
    user?.role === "ADMIN" && user.status === "APPROVED"
      ? [...MODULE_LINKS, { href: "/admin/users", label: "Admin" }]
      : MODULE_LINKS;
  const shouldHideAuthActions = isCheckingAuth && !isRefreshingAuth;

  return (
    <header className="global-header">
      <div className="global-header-shell">
        <HeroLink as={NextLink} href="/" color="foreground" className="global-header-brand">
          <span className="global-header-brand-mark">Hwimae</span>
        </HeroLink>

        <nav className="global-header-menu global-header-module-rail" aria-label="Điều hướng chính">
          {links.map((item) => {
            const isActive = isModuleActive(pathname, item.href);

            return (
              <HeroLink
                key={item.href}
                as={NextLink}
                href={item.href}
                color="foreground"
                aria-current={isActive ? "page" : undefined}
                className="global-header-nav-link"
              >
                {item.label}
              </HeroLink>
            );
          })}
        </nav>

        <div className="global-header-actions global-header-auth-actions">
          {!shouldHideAuthActions &&
            (user ? (
              <>
                <div className="global-header-account">
                  <CircleUserRound size={16} />
                  <span className="global-header-account-name">{user.name}</span>
                </div>
                <Button
                  color="primary"
                  variant="flat"
                  radius="full"
                  className="global-header-auth-button global-header-register-button"
                  onPress={logout}
                >
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={NextLink}
                  href="/login"
                  color="primary"
                  variant="light"
                  radius="full"
                  className="global-header-auth-button global-header-login-button"
                >
                  Login
                </Button>
                <Button
                  as={NextLink}
                  href="/register"
                  color="primary"
                  radius="full"
                  className="global-header-auth-button global-header-register-button"
                >
                  Register
                </Button>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}

"use client";

import { usePathname } from "next/navigation";
import React, { type ReactNode } from "react";

import { FinanceNav } from "./finance-nav";

const PAGE_TITLES: Record<string, string> = {
  "/finance/dashboard": "Tài chính cá nhân",
  "/finance/chat": "AI tài chính",
  "/finance/expenses": "Chi tiêu",
  "/finance/budgets": "Ngân sách",
  "/finance/groups": "Nhóm tài chính",
};

const DEFAULT_TITLE = "Quản lý tài chính";

type FinanceShellProps = {
  children: ReactNode;
};

export function FinanceShell({ children }: FinanceShellProps) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? DEFAULT_TITLE;

  return (
    <main className="page-shell page-shell-workspace">
      <h1 className="sr-only">{title}</h1>
      <div className="finance-shell-frame">
        <div className="finance-shell-nav-row">
          <FinanceNav />
        </div>
        <div className="finance-shell-content">{children}</div>
      </div>
    </main>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";

import { EmptyState } from "../ui";
import {
  createFinanceExpense,
  getFinanceCategories,
  listFinanceExpenses,
} from "../../lib/finance-api";
import type { FinanceCategory, FinanceExpense } from "../../types/finance";
import {
  FinanceExpensesContent,
  type FinanceExpenseDraft,
  type FinanceSubmitMessage,
} from "./finance-expenses-content";
import { buildFinanceExpensePayload } from "./finance-expenses-helpers";
import { buildFinanceExpenseHighlights } from "./finance-expenses-summary";
import {
  FINANCE_SUBMIT_TIMEOUT_MS,
  isFinanceSubmitTimeoutError,
  runFinanceSubmitWithTimeout,
} from "./finance-submit-recovery";

type ExpensesState = {
  categories: FinanceCategory[];
  expenses: FinanceExpense[];
  isLoading: boolean;
  error: string | null;
};

const EMPTY_DRAFT: FinanceExpenseDraft = {
  merchantName: "",
  description: "",
  amount: "",
  categoryId: "",
  spentAt: "",
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function FinanceExpenses() {
  const mountedRef = useRef(true);
  const submitAbortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ExpensesState>({
    categories: [],
    expenses: [],
    isLoading: true,
    error: null,
  });
  const [draft, setDraft] = useState<FinanceExpenseDraft>(EMPTY_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] =
    useState<FinanceSubmitMessage | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      submitAbortRef.current?.abort();
    };
  }, []);

  async function loadExpensesData(signal?: AbortSignal): Promise<boolean> {
    try {
      const [categories, expenses] = await Promise.all([
        getFinanceCategories({ signal }),
        listFinanceExpenses({ signal }),
      ]);

      if (!mountedRef.current || signal?.aborted) return false;
      setState({ categories, expenses, isLoading: false, error: null });
      return true;
    } catch (error) {
      if (isAbortError(error) || !mountedRef.current || signal?.aborted)
        return false;
      setState({
        categories: [],
        expenses: [],
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Không thể tải chi tiêu.",
      });
      return false;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadExpensesData(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildFinanceExpensePayload(draft);
    if (!payload) {
      setSubmitMessage({
        tone: "error",
        text: "Vui lòng nhập số tiền hợp lệ.",
      });
      return;
    }

    submitAbortRef.current?.abort();
    const controller = new AbortController();
    submitAbortRef.current = controller;

    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const created = await runFinanceSubmitWithTimeout(
        controller,
        (signal) => createFinanceExpense(payload, { signal }),
        FINANCE_SUBMIT_TIMEOUT_MS,
      );

      if (!mountedRef.current || controller.signal.aborted) return;
      setState((current) => ({
        ...current,
        expenses: [created, ...current.expenses],
        error: null,
      }));
      setDraft(EMPTY_DRAFT);
      setSubmitMessage({ tone: "success", text: "Đã thêm khoản chi mới." });
    } catch (error) {
      if (
        !mountedRef.current ||
        isAbortError(error) ||
        controller.signal.aborted
      )
        return;

      if (isFinanceSubmitTimeoutError(error)) {
        setSubmitMessage({
          tone: "info",
          text: "Hệ thống đang chậm, đang tải lại dữ liệu chi tiêu...",
        });
        const didReload = await loadExpensesData();
        if (!mountedRef.current) return;
        setSubmitMessage(
          didReload
            ? {
                tone: "info",
                text: "Dữ liệu chi tiêu đã được tải lại. Vui lòng thử thêm lại nếu cần.",
              }
            : {
                tone: "error",
                text: "Không thể tải lại dữ liệu chi tiêu. Vui lòng thử lại sau.",
              },
        );
        return;
      }

      setSubmitMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Không thể thêm khoản chi.",
      });
    } finally {
      if (submitAbortRef.current === controller) {
        submitAbortRef.current = null;
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    }
  }

  if (state.isLoading) {
    return (
      <section className="flex flex-col gap-5">
        <EmptyState title="Đang tải chi tiêu..." />
      </section>
    );
  }

  const highlights = buildFinanceExpenseHighlights(
    state.categories,
    state.expenses,
  );

  return (
    <section className="section-stack finance-expenses-page">
      {state.error ? <EmptyState tone="error" title={state.error} /> : null}
      <FinanceExpensesContent
        categories={state.categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={isSubmitting}
        submitMessage={submitMessage}
        onSubmit={handleSubmit}
        onDraftChange={(patch) =>
          setDraft((current) => ({ ...current, ...patch }))
        }
      />
    </section>
  );
}

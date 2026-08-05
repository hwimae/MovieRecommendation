"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import React, { FormEvent, useRef, useState } from "react";

import { FormField } from "@/components/ui/form-field";
import { CardSurface } from "@/components/ui";
import { PageShell } from "@/components/ui/page-shell";
import { StatusMessage } from "@/components/ui/status-message";
import { apiPost } from "@/lib/api";
import { parseRegisterResponse } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRegionRef = useRef<HTMLDivElement>(null);
  const errorRegionId = "register-form-error";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiPost(
        "/auth/register",
        { name, email, password },
        undefined,
        parseRegisterResponse,
      );

      router.replace("/login?registered=pending");
    } catch {
      setError("Đăng ký thất bại. Vui lòng thử lại.");
      requestAnimationFrame(() => {
        errorRegionRef.current?.focus();
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Đăng ký"
      description="Tạo tài khoản để lưu review, nhận gợi ý và quản lý tài chính."
      eyebrow="Auth"
      variant="workspace"
    >
      <div className="auth-layout auth-layout-compact">
        <CardSurface className="auth-card">
          <div className="form-surface-heading">
            <h2>Tạo tài khoản mới</h2>
          </div>

          <form onSubmit={handleSubmit} className="section-stack">
            <FormField
              id="name"
              name="name"
              type="text"
              label="Họ tên"
              autoComplete="name"
              required
              aria-describedby={error ? errorRegionId : undefined}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <FormField
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
              aria-describedby={error ? errorRegionId : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <FormField
              id="password"
              name="password"
              type="password"
              label="Mật khẩu"
              autoComplete="new-password"
              required
              aria-describedby={error ? errorRegionId : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <div id={errorRegionId} ref={errorRegionRef} aria-live="assertive" aria-atomic="true" tabIndex={-1}>
              {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
            </div>

            <Button color="primary" type="submit" isLoading={isSubmitting}>
              {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
            </Button>
          </form>
        </CardSurface>
      </div>
    </PageShell>
  );
}

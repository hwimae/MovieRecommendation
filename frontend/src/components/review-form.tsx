"use client";

import React, { FormEvent, useId, useRef, useState } from "react";

import { StatusMessage } from "@/components/ui/status-message";
import { Button, CardSurface, FormField } from "./ui";
import { apiPost } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type ReviewFormProps = {
  storyId: string;
};

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export function ReviewForm({ storyId }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const titleId = useId();
  const contentId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const token = getAccessToken();
    if (!token) {
      setError("Bạn cần đăng nhập để viết review truyện.");
      requestAnimationFrame(() => statusRef.current?.focus());
      return;
    }

    setIsSubmitting(true);

    try {
      await apiPost("/reviews", { storyId, rating, title, content }, token);
      setMessage("Đã lưu review của bạn.");
      requestAnimationFrame(() => statusRef.current?.focus());
    } catch {
      setError("Không thể gửi review lúc này. Vui lòng thử lại sau.");
      requestAnimationFrame(() => statusRef.current?.focus());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="review-title"
      className="section-stack review-form-surface"
    >
      <CardSurface className="workspace-card">
        <div className="form-surface-heading">
          <p className="eyebrow">Đánh giá</p>
          <h2 id="review-title">Viết review truyện</h2>
          <p className="result-summary">
            Chia sẻ cảm nhận để hệ thống hiểu gu đọc của bạn hơn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="section-stack">
          <FormField
            kind="radio"
            id="review-rating"
            label="Điểm đánh giá"
            value={String(rating)}
            onValueChange={(value) => setRating(Number(value))}
            isDisabled={isSubmitting}
            options={STAR_VALUES.map((star) => ({
              value: String(star),
              label: `${star} sao`,
            }))}
          />

          <FormField
            id={titleId}
            label="Tiêu đề review"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
            aria-describedby={(error ?? message) ? statusId : undefined}
          />

          <FormField
            id={contentId}
            kind="textarea"
            label="Nội dung review"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            maxLength={5000}
            minRows={5}
            aria-describedby={(error ?? message) ? statusId : undefined}
          />

          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Đang gửi..." : "Gửi review"}
          </Button>

          <div
            id={statusId}
            ref={statusRef}
            aria-live="assertive"
            aria-atomic="true"
            tabIndex={-1}
          >
            {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
            {!error && message ? (
              <StatusMessage tone="success">{message}</StatusMessage>
            ) : null}
          </div>
        </form>
      </CardSurface>
    </section>
  );
}

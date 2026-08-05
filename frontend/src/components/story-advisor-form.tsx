"use client";

import { Wand2 } from "lucide-react";
import React, { FormEvent, useState } from "react";

import { ApiError } from "../lib/api";
import { requestStoryAdvisorRecommendations } from "../lib/story-recommendations";
import type { StoryAdvisorResponse } from "../types/recommendation";
import { AdvisorQuickPrompts } from "./stories/advisor-quick-prompts";
import { AdvisorSummaryCard } from "./stories/advisor-summary-card";
import { RecommendationStoryCard } from "./stories/recommendation-story-card";
import { Button, CardSurface, FormField } from "./ui";
import { StatusMessage } from "./ui/status-message";

const EXAMPLE_QUERY =
  "Tôi thích truyện tu tiên, nam chính từ yếu thành mạnh, ít ngôn tình";
const MAX_ADVISOR_QUERY_LENGTH = 500;
const STORY_ADVISOR_GENERIC_ERROR =
  "Không thể tải bộ mã hoá truyện trên trình duyệt hoặc gọi semantic search lúc này. Hãy thử lại sau ít phút.";

export const ADVISOR_QUICK_PROMPTS = [
  "Huyền huyễn",
  "Trọng sinh",
  "Nữ cường",
  "Điền văn",
] as const;

export function buildAdvisorPromptValue(prompt: string) {
  return `Mình muốn đọc truyện ${prompt}, nhân vật chính có chiều sâu, nhịp truyện cuốn hút và bối cảnh rõ nét.`;
}

export function resolveStoryAdvisorErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.message.trim().length > 0) {
    return error.message;
  }

  return STORY_ADVISOR_GENERIC_ERROR;
}

export function StoryAdvisorForm() {
  const [query, setQuery] = useState(EXAMPLE_QUERY);
  const [result, setResult] = useState<StoryAdvisorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRecommendations = (result?.recommendations.length ?? 0) > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setError("Hãy nhập gu truyện ít nhất 2 ký tự.");
      setResult(null);
      return;
    }

    if (trimmedQuery.length > MAX_ADVISOR_QUERY_LENGTH) {
      setError(`Hãy giữ mô tả trong khoảng ${MAX_ADVISOR_QUERY_LENGTH} ký tự.`);
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestStoryAdvisorRecommendations(
        trimmedQuery,
        5,
      );
      setResult(response);
    } catch (error) {
      setError(resolveStoryAdvisorErrorMessage(error));
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section-stack story-advisor-layout">
      <CardSurface className="workspace-card story-advisor-card">
        <div className="form-surface-heading">
          <h2>Tìm truyện cùng AI</h2>
          <p className="result-summary">
            Trình duyệt sẽ tạo vector từ gu đọc của bạn rồi gửi sang backend để
            tìm truyện gần nghĩa nhất.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-surface-stack">
          <FormField
            kind="textarea"
            id="advisor-query"
            aria-label="Gu truyện của bạn"
            label="Gu truyện của bạn"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minRows={5}
            maxLength={MAX_ADVISOR_QUERY_LENGTH}
            placeholder="Ví dụ: Mình thích thể loại tu tiên, main lạnh lùng sát phạt quyết đoán, bối cảnh hoành tráng, không hậu cung."
            className="story-advisor-field"
          />

          <div className="story-advisor-action-row">
            <div className="story-advisor-action-hint">
              <Wand2 size={16} />
              <span>
                Mô tả thể loại, nhân vật, bối cảnh hoặc nhịp truyện bạn muốn
                đọc.
              </span>
            </div>
            <Button
              type="submit"
              isLoading={isLoading}
              className="story-advisor-submit-button"
            >
              {isLoading
                ? "Đang tạo vector và tìm truyện…"
                : "Tạo vector và tìm truyện"}
            </Button>
          </div>
        </form>
      </CardSurface>

      <AdvisorQuickPrompts
        prompts={ADVISOR_QUICK_PROMPTS}
        disabled={isLoading}
        onSelectPrompt={(prompt) => setQuery(buildAdvisorPromptValue(prompt))}
      />

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

      {result ? <AdvisorSummaryCard answer={result.answer} /> : null}

      {result && hasRecommendations ? (
        <div className="story-grid story-advisor-results-grid">
          {result.recommendations.map((item) => (
            <RecommendationStoryCard key={item.storyId} item={item} />
          ))}
        </div>
      ) : null}

      {result && !hasRecommendations ? (
        <section className="empty-state-card story-advisor-empty-state">
          <h3>Chưa tìm thấy truyện phù hợp</h3>
          <p>
            Hãy thử mô tả kỹ hơn về thể loại, nhân vật chính, bối cảnh hoặc nhịp
            truyện bạn muốn đọc.
          </p>
        </section>
      ) : null}
    </section>
  );
}

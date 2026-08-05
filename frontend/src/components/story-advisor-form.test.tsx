import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../lib/api";

vi.mock("../lib/story-recommendations", () => ({
  requestStoryAdvisorRecommendations: vi.fn(),
}));

import {
  ADVISOR_QUICK_PROMPTS,
  buildAdvisorPromptValue,
  resolveStoryAdvisorErrorMessage,
  StoryAdvisorForm,
} from "./story-advisor-form";

describe("buildAdvisorPromptValue", () => {
  it("expands quick prompt chips into a fuller query", () => {
    expect(buildAdvisorPromptValue("Huyền huyễn")).toContain("Huyền huyễn");
    expect(buildAdvisorPromptValue("Huyền huyễn")).toContain("nhân vật chính");
  });
});

describe("resolveStoryAdvisorErrorMessage", () => {
  it("prefers backend application errors over the generic browser-embedding message", () => {
    expect(
      resolveStoryAdvisorErrorMessage(
        new ApiError(
          "POST",
          "/recommendations/search-by-vector",
          400,
          "Chưa có dữ liệu truyện đã được index.",
        ),
      ),
    ).toBe("Chưa có dữ liệu truyện đã được index.");
  });

  it("falls back to the generic browser-embedding message for non-api failures", () => {
    expect(resolveStoryAdvisorErrorMessage(new Error("load failed"))).toContain(
      "Không thể tải bộ mã hoá truyện trên trình duyệt",
    );
  });
});

describe("StoryAdvisorForm", () => {
  it("renders browser-search CTA text inside the shared form surface before any result", () => {
    const html = renderToStaticMarkup(<StoryAdvisorForm />);

    expect(ADVISOR_QUICK_PROMPTS).toEqual([
      "Huyền huyễn",
      "Trọng sinh",
      "Nữ cường",
      "Điền văn",
    ]);
    expect(html).toContain("Tìm truyện cùng AI");
    expect(html).toContain('data-testid="card-surface"');
    expect(html).toContain("story-advisor-card");
    expect(html).not.toContain("story-advisor-hero");
    expect(html).toContain("Tạo vector và tìm truyện");
    expect(html).toContain("Trình duyệt sẽ tạo vector");
    expect(html).toContain("Gợi ý nhanh");
    expect(html).toContain("story-advisor-field");
    expect(html).toContain('data-testid="form-field"');
    expect(html).toContain('data-kind="textarea"');
    expect(html).not.toContain("StoryRec AI");
  });
});

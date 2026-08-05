import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/form-field", () => ({
  FormField: ({ label }: { label: string }) => React.createElement("div", null, label),
}));

vi.mock("@/components/ui/status-message", () => ({
  StatusMessage: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

vi.mock("@/lib/api", () => ({
  apiPost: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAccessToken: vi.fn(),
}));

import { ReviewForm } from "./review-form";

describe("ReviewForm", () => {
  it("renders the review controls inside the shared form surface", () => {
    const html = renderToStaticMarkup(<ReviewForm storyId="story-1" />);
    expect(html).toContain('data-testid="card-surface"');
    expect(html).toContain("Viết review truyện");
    expect(html).toContain("Gửi review");
  });
});

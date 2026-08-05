"use client";

import dynamic from "next/dynamic";
import React from "react";

import { CardSurface } from "./ui";

const StoryAdvisorForm = dynamic(
  () =>
    import("./story-advisor-form").then((module) => module.StoryAdvisorForm),
  {
    ssr: false,
    loading: () => <StoryAdvisorLoadingState />,
  },
);

function StoryAdvisorLoadingState() {
  return (
    <section className="section-stack story-advisor-layout">
      <CardSurface className="workspace-card story-advisor-card">
        <div className="form-surface-heading">
          <h2>Tìm truyện cùng AI</h2>
          <p className="result-summary">
            Trình duyệt đang tải công cụ AI tư vấn để tạo vector từ gu đọc của
            bạn.
          </p>
        </div>
        <p className="result-summary">Đang tải công cụ AI tư vấn…</p>
      </CardSurface>
    </section>
  );
}

export function StoryAdvisorPanel() {
  return <StoryAdvisorForm />;
}

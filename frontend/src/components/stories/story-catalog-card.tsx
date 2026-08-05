import React from "react";
import { BookOpenText, Star } from "lucide-react";
import Link from "next/link";

import type { PaginatedStories } from "@/types/story";
import { Chip } from "../ui";

export function StoryCatalogCard({
  story,
}: {
  story: PaginatedStories["items"][number];
}) {
  return (
    <Link href={`/stories/${story.id}`} className="story-catalog-card">
      <div className="story-catalog-cover">
        <div className="story-catalog-cover-glow" aria-hidden="true" />
        <span
          className="story-catalog-rating"
          aria-label={`Đánh giá ${story.userAverageRating.toFixed(1)}`}
        >
          <Star size={12} aria-hidden="true" />
          {story.userAverageRating.toFixed(1)}
        </span>
        <BookOpenText size={28} aria-hidden="true" />
      </div>

      <div className="story-catalog-copy">
        <h3 className="story-title">{story.title}</h3>
        <p className="story-meta">Tác giả: {story.authors}</p>
        <div className="form-actions">
          <Chip tone="primary">{story.category}</Chip>
          {story.hasContent ? <Chip tone="success">Có nội dung</Chip> : null}
        </div>
      </div>
    </Link>
  );
}

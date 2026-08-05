import React from "react";
import { Sparkles, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

import type { RecommendationsResponse } from "@/types/recommendation";
import { Chip } from "../ui";

export function StoryRecommendationShowcase({
  items,
}: {
  items: RecommendationsResponse["items"];
}) {
  const [featured, ...rest] = items;

  if (!featured) {
    return null;
  }

  return (
    <div className="story-recommendation-showcase">
      <Link
        href={`/stories/${featured.storyId}`}
        className="story-recommendation-featured"
      >
        <div className="story-recommendation-visual" aria-hidden="true" />

        <div className="story-recommendation-copy">
          <div className="story-recommendation-score">
            <span className="story-recommendation-rating">
              <Star size={14} />
              {featured.averageRating.toFixed(1)}
            </span>
            <span className="story-recommendation-score-pill">
              Score {featured.score.toFixed(2)}
            </span>
          </div>

          <h3 className="story-title">{featured.title}</h3>
          <p className="story-meta">Tác giả: {featured.authors}</p>

          <div className="form-actions">
            <Chip tone="primary">{featured.category}</Chip>
          </div>

          <p>{featured.reason}</p>
          <p className="story-recommendation-reason">
            <Sparkles size={14} />
            Phù hợp với gu hiện tại của bạn
          </p>
        </div>
      </Link>

      <div className="story-recommendation-compact-list">
        {rest.map((item) => (
          <Link
            key={item.storyId}
            href={`/stories/${item.storyId}`}
            className="story-recommendation-compact"
          >
            <div
              className="story-recommendation-visual is-compact"
              aria-hidden="true"
            />
            <h3 className="story-title">{item.title}</h3>
            <p className="story-meta">Tác giả: {item.authors}</p>

            <div className="form-actions story-recommendation-compact-meta">
              <Chip tone="neutral">{item.category}</Chip>
              <span className="story-recommendation-rating">
                <Star size={14} />
                {item.averageRating.toFixed(1)}
              </span>
            </div>

            <p className="story-recommendation-compact-note">
              <TrendingUp size={14} />
              {item.reason}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

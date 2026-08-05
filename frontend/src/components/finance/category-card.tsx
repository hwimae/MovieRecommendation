import React from "react";

import { CardSurface } from "../ui";
import { calculatePercentage, formatFinanceMoney } from "./finance-format";

type CategoryCardProps = {
  category: {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    spent: number;
    budget: number;
  };
};

export function CategoryCard({ category }: CategoryCardProps) {
  const hasBudget = category.budget > 0;
  const percentage = hasBudget
    ? Math.max(0, calculatePercentage(category.spent, category.budget))
    : 0;
  const normalizedPercentage = hasBudget ? Math.min(percentage, 100) : 0;
  const isOverBudget = hasBudget && category.spent > category.budget;
  const categoryIcon = category.icon || category.name.slice(0, 1).toUpperCase();
  const iconTint = category.color ? `${category.color}22` : undefined;

  return (
    <CardSurface as="article" className="section-stack finance-category-card">
      <header className="finance-category-card-header">
        <div className="finance-category-card-title">
          <span
            className="finance-category-icon"
            style={{
              backgroundColor: iconTint,
              color: category.color ?? undefined,
            }}
            aria-hidden="true"
          >
            {categoryIcon}
          </span>
          <div className="section-stack finance-category-card-copy">
            <h3>{category.name}</h3>
            <p>Đã chi {formatFinanceMoney(category.spent)}</p>
          </div>
        </div>
        <div className="section-stack finance-category-status-block">
          <strong className="finance-category-percentage">
            {Math.round(percentage)}%
          </strong>
          {isOverBudget ? (
            <span className="finance-category-status">Vượt hạn mức</span>
          ) : null}
        </div>
      </header>

      <div
        className="finance-category-summary-row"
        aria-label={`Tóm tắt ngân sách ${category.name}`}
      >
        <span>
          <strong>Đã chi:</strong> {formatFinanceMoney(category.spent)}
        </span>
        <span>
          <strong>Ngân sách:</strong>{" "}
          {hasBudget
            ? formatFinanceMoney(category.budget)
            : "Chưa có ngân sách"}
        </span>
      </div>

      <div className="finance-category-progress-track" aria-hidden="true">
        <span
          className="finance-category-progress-fill"
          style={{ width: `${normalizedPercentage}%` }}
        />
      </div>
      <progress
        className="finance-category-progress"
        value={normalizedPercentage}
        max={100}
        aria-label={`Tiến độ ngân sách ${category.name}`}
      >
        {normalizedPercentage}%
      </progress>
    </CardSurface>
  );
}

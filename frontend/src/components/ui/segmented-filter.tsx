import React from "react";

import { Button } from "./button";

export type SegmentedFilterItem = {
  key: string;
  label: string;
};

export type SegmentedFilterProps = {
  items: SegmentedFilterItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  isDisabled?: boolean;
  /** Bắt buộc — nhóm nút cần nhãn để trình đọc màn hình biết đang lọc cái gì. */
  ariaLabel: string;
  className?: string;
};

export function SegmentedFilter({
  items,
  activeKey,
  onChange,
  isDisabled,
  ariaLabel,
  className,
}: SegmentedFilterProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid="segmented-filter"
      className={`flex flex-wrap gap-1 rounded-pill bg-surfaceMuted p-1 ${className ?? ""}`}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;

        return (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant={isActive ? "primary" : "ghost"}
            aria-current={isActive ? true : undefined}
            isDisabled={isDisabled}
            onPress={onChange ? () => onChange(item.key) : undefined}
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}

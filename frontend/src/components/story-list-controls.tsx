"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "./ui";
import { FormField } from "./ui/form-field";

type StoryListControlsProps = {
  query: string;
  hasContent: boolean;
};

export function buildStoryListQueryHref(
  pathname: string,
  currentSearch: string,
  nextState: { query: string; hasContent: boolean },
) {
  const params = new URLSearchParams(currentSearch);
  const normalizedSearch = nextState.query.trim();

  if (normalizedSearch.length > 0) {
    params.set("q", normalizedSearch);
  } else {
    params.delete("q");
  }

  if (nextState.hasContent) {
    params.set("hasContent", "true");
  } else {
    params.delete("hasContent");
  }

  params.delete("page");
  const next = params.toString();
  return next ? `${pathname}?${next}` : pathname;
}

export function StoryListControls({
  query,
  hasContent,
}: StoryListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(query);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextUrl = buildStoryListQueryHref(
        pathname,
        searchParams.toString(),
        {
          query: search,
          hasContent,
        },
      );
      const current = searchParams.toString();
      const currentUrl = current ? `${pathname}?${current}` : pathname;

      if (nextUrl !== currentUrl) {
        router.replace(nextUrl);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [hasContent, pathname, router, search, searchParams]);

  return (
    <div className="story-controls-bar">
      <FormField
        id="story-search"
        label="Tìm kiếm truyện"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Tìm tên truyện, tác giả hoặc thể loại..."
      />
      <Button
        as={Link}
        href={buildStoryListQueryHref(pathname, searchParams.toString(), {
          query: search,
          hasContent: !hasContent,
        })}
        variant={hasContent ? "primary" : "ghost"}
      >
        {hasContent ? "Đang lọc truyện có nội dung" : "Chỉ hiện có nội dung"}
      </Button>
    </div>
  );
}

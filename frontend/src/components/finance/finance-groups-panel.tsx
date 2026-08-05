"use client";

import React, { useState } from "react";

import type { FinanceGroupSummary } from "../../types/finance";
import { Button } from "../ui";
import { StatusMessage } from "../ui/status-message";

type FinanceGroupsPanelProps = {
  groups: FinanceGroupSummary[];
  selectedGroupId: string | null;
  isLoading: boolean;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (name: string) => Promise<boolean> | boolean;
};

export function FinanceGroupsPanel({
  groups,
  selectedGroupId,
  isLoading,
  onSelectGroup,
  onCreateGroup,
}: FinanceGroupsPanelProps) {
  const [name, setName] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const didCreate = await onCreateGroup(trimmed);
    if (didCreate) setName("");
  }

  return (
    <aside
      className="finance-groups-sidebar-column finance-groups-chooser section-stack"
      aria-label="Quản lý nhóm tài chính"
    >
      <section className="workspace-card section-stack finance-groups-create-card">
        <h2>Tạo nhóm mới</h2>
        <p>
          Mời bạn bè hoặc người thân cùng theo dõi dashboard tài chính cá nhân
          trong một không gian chung.
        </p>
        <form
          className="section-stack finance-groups-create-form"
          onSubmit={handleSubmit}
        >
          <label className="form-field" htmlFor="finance-group-name">
            <span>Tên nhóm</span>
            <input
              id="finance-group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button type="submit">
            {groups.length === 0 ? "Tạo nhóm đầu tiên" : "Tạo nhóm"}
          </button>
        </form>
      </section>

      <section
        className="workspace-card section-stack finance-groups-list-card finance-groups-selection-stack"
        aria-label="Danh sách nhóm"
      >
        <div className="section-stack">
          <h2>Danh sách nhóm</h2>
          <p>Chọn nhóm để xem thành viên và mở dashboard của từng người.</p>
        </div>
        {isLoading ? (
          <StatusMessage>Đang tải danh sách nhóm tài chính...</StatusMessage>
        ) : null}
        {!isLoading && groups.length === 0 ? (
          <StatusMessage>Bạn chưa tham gia nhóm tài chính nào.</StatusMessage>
        ) : null}
        <div className="section-stack finance-group-list">
          {groups.map((group) => {
            const isActive = selectedGroupId === group.id;
            const roleLabel =
              group.currentUserRole === "OWNER" ? "Chủ nhóm" : "Thành viên";

            return (
              <Button
                key={group.id}
                type="button"
                variant="ghost"
                className={`finance-group-list-item${isActive ? " finance-group-list-item-active" : ""}`}
                aria-pressed={isActive}
                onPress={() => onSelectGroup(group.id)}
              >
                <span className="finance-group-list-item-title">
                  {group.name}
                </span>
                <span className="finance-group-list-item-meta">
                  {roleLabel} · {group.memberCount} thành viên
                </span>
              </Button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

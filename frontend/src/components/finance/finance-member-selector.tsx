"use client";

import React from "react";

import type { FinanceGroupMember } from "../../types/finance";
import { Button } from "../ui";

type FinanceMemberSelectorProps = {
  members: FinanceGroupMember[];
  selectedMemberUserId: string | null;
  onSelectMember: (memberUserId: string) => void;
};

export function FinanceMemberSelector({
  members,
  selectedMemberUserId,
  onSelectMember,
}: FinanceMemberSelectorProps) {
  return (
    <section
      className="workspace-card section-stack finance-member-selector-card finance-groups-detail-stack"
      aria-label="Chọn thành viên để xem Finance"
    >
      <div className="section-stack">
        <h3>Chọn thành viên để xem</h3>
        <p>
          Bạn đang mở dashboard tài chính cá nhân của từng thành viên ngay trong
          cùng một nhóm.
        </p>
      </div>
      <div
        className="finance-member-selector-list"
        aria-label="Danh sách thành viên nhóm"
      >
        {members.map((member) => (
          <Button
            key={member.userId}
            type="button"
            variant="ghost"
            className={`finance-member-selector-item${selectedMemberUserId === member.userId ? " finance-member-selector-item-active" : ""}`}
            aria-pressed={selectedMemberUserId === member.userId}
            onPress={() => onSelectMember(member.userId)}
          >
            {member.name}
          </Button>
        ))}
      </div>
    </section>
  );
}

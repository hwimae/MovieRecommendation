import { PageState } from "@/components/ui/page-state";

export default function FinanceLoading() {
  return (
    <main className="page-shell page-shell-workspace">
      <h1 className="sr-only">Đang tải tài chính</h1>
      <PageState
        tone="loading"
        title="Đang tải workspace tài chính"
        description="Đang chuẩn bị dashboard, giao dịch và các nhóm chia sẻ của bạn."
      />
    </main>
  );
}

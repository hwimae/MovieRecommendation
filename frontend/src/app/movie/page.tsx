import NextLink from "next/link";

import { Button, Chip } from "@/components/ui";
import { PageShell } from "@/components/ui/page-shell";
import { PageState } from "@/components/ui/page-state";

export default function MoviePage() {
  return (
    <PageShell
      title="Phim"
      description="Khu vực phim đang được hoàn thiện theo cùng ngôn ngữ giao diện với Truyện và Tài chính."
      eyebrow="Coming soon"
      variant="workspace"
    >
      <section
        className="page-state page-state-info section-stack"
        aria-label="Trạng thái module phim"
      >
        <Chip tone="warning">Đang hoàn thiện</Chip>
        <h2>Không gian phim sẽ là module tiếp theo</h2>
        <p className="result-summary">
          Hiện tại bạn có thể quay về trang chủ hoặc mở khu Truyện/Tài chính để
          tiếp tục dùng app.
        </p>
        <div className="form-actions">
          <Button as={NextLink} href="/">
            Về trang chủ
          </Button>
        </div>
      </section>
      <PageState
        tone="info"
        title="Thiết kế đã sẵn sàng cho bước tiếp theo"
        description="Shell, card và trạng thái đang được chuẩn hóa để khi module phim có dữ liệu thật, có thể tái sử dụng ngay hệ giao diện hiện tại."
      />
    </PageShell>
  );
}

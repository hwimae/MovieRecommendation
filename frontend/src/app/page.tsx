import {
  ArrowRight,
  BookOpenText,
  Clapperboard,
  Compass,
  Film,
  ReceiptText,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import NextLink from "next/link";

import { CardSurface, TextLink } from "@/components/ui";

const WORKSPACE_ITEMS: Array<{
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "stories" | "finance" | "movie";
}> = [
  {
    label: "Truyện mới cập nhật",
    value: "0",
    icon: BookOpenText,
    tone: "stories",
  },
  {
    label: "Giao dịch cần duyệt",
    value: "0",
    icon: ReceiptText,
    tone: "finance",
  },
  {
    label: "Phim đang xem",
    value: "0",
    icon: Film,
    tone: "movie",
  },
];

const MODULES: Array<{
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  tone: "stories" | "finance" | "movie";
}> = [
  {
    href: "/stories",
    title: "Truyện",
    description:
      "Không gian sáng tác, dịch thuật và quản lý kho tàng truyện của bạn với các công cụ hỗ trợ đọc và lưu trữ.",
    cta: "Khám phá ngay",
    icon: BookOpenText,
    tone: "stories",
  },
  {
    href: "/finance/dashboard",
    title: "Tài chính",
    description:
      "Kiểm soát dòng tiền, quản lý ngân sách nhóm và cá nhân minh bạch, an toàn và dễ theo dõi.",
    cta: "Quản lý ngay",
    icon: WalletCards,
    tone: "finance",
  },
  {
    href: "/movie",
    title: "Phim",
    description:
      "Lưu trữ, đánh giá và chia sẻ danh sách những bộ phim yêu thích trong cùng hệ giao diện Hwimae.",
    cta: "Xem danh sách",
    icon: Clapperboard,
    tone: "movie",
  },
];

export default function HomePage() {
  return (
    <main className="page-shell home-shell">
      <section className="home-hero-grid" aria-labelledby="home-title">
        <div className="section-stack home-hero-copy">
          <div className="section-stack home-hero-text">
            <h1 id="home-title" className="home-hero-title">
              Không gian kể chuyện &amp; quản lý tài chính thông minh.
            </h1>
            <p className="home-hero-description">
              Tổ chức công việc sáng tạo, theo dõi chi tiêu và khám phá nội dung
              giải trí trong một không gian duy nhất, tĩnh lặng và tập trung.
            </p>
          </div>

          <div className="home-action-row">
            <NextLink
              href="/stories"
              className="home-action home-action-primary"
            >
              <Compass size={18} />
              <span>Khám phá truyện</span>
            </NextLink>
            <NextLink
              href="/finance/dashboard"
              className="home-action home-action-secondary"
            >
              <WalletCards size={18} />
              <span>Quản lý tài chính</span>
            </NextLink>
          </div>
        </div>

        <CardSurface
          className="home-workspace-card"
          title={
            <>
              <span className="home-workspace-title-icon">
                <BookOpenText size={18} />
              </span>
              Workspace hôm nay
            </>
          }
          action={<span className="home-workspace-caption">Bản xem trước</span>}
        >
          <ul className="home-workspace-list" role="list">
            {WORKSPACE_ITEMS.map(({ label, value, icon: Icon, tone }) => (
              <li
                key={label}
                className={`home-workspace-item home-workspace-item-${tone}`}
              >
                <div className="home-workspace-item-copy">
                  <span
                    className={`home-workspace-item-icon home-workspace-item-icon-${tone}`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="home-workspace-item-label">{label}</span>
                </div>
                <strong className="home-workspace-item-value">{value}</strong>
              </li>
            ))}
          </ul>
        </CardSurface>
      </section>

      <section
        className="home-module-grid"
        aria-label="Các module chính của Hwimae"
      >
        {MODULES.map(({ href, title, description, cta, icon: Icon, tone }) => (
          <TextLink
            key={href}
            as={NextLink}
            href={href}
            className={`home-module-card home-module-card-${tone}`}
          >
            <span className={`home-module-icon home-module-icon-${tone}`}>
              <Icon size={30} strokeWidth={2.1} />
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className={`home-module-link home-module-link-${tone}`}>
              {cta}
              <ArrowRight size={16} />
            </span>
          </TextLink>
        ))}
      </section>

      <footer className="home-footer">
        <p>© 2024 Hwimae. Không gian kể chuyện sáng tạo.</p>
        <div className="home-footer-links">
          <TextLink as={NextLink} href="/stories">
            Truyện
          </TextLink>
          <TextLink as={NextLink} href="/finance/dashboard">
            Tài chính
          </TextLink>
          <TextLink as={NextLink} href="/recommendations">
            AI tư vấn
          </TextLink>
        </div>
      </footer>
    </main>
  );
}

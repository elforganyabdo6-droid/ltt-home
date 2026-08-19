"use client";

import { formatInt } from "@/lib/format";

export const VIEWS = [
  "overview",
  "customers",
  "prediction",
  "at-risk",
  "reasons",
  "reports",
] as const;

export type ViewId = (typeof VIEWS)[number];

export const VIEW_META: Record<
  ViewId,
  { nav: string; title: string; description: string }
> = {
  overview: {
    nav: "الرئيسية",
    title: "لوحة تحكم تنبؤ مغادرة العملاء",
    description:
      "تحليل وتوقع احتمالية مغادرة عملاء LTT، مع فصل واضح بين المغادرة الفعلية والمتوقعة",
  },
  customers: {
    nav: "تحليل العملاء",
    title: "تحليل العملاء",
    description: "استكشاف قاعدة العملاء عبر الباقات والمناطق ومدة الاشتراك ومستوى الاستخدام",
  },
  prediction: {
    nav: "التنبؤ بالـ Churn",
    title: "التنبؤ بالـ Churn",
    description: "مخرجات النموذج لكل عميل: الاحتمالية، مستوى الخطورة، وثقة النموذج",
  },
  "at-risk": {
    nav: "العملاء المعرضون للمغادرة",
    title: "العملاء المعرضون للمغادرة",
    description: "قائمة العمل: العملاء ذوو خطورة متوسطة أو مرتفعة مع الإجراء المقترح لكل عميل",
  },
  reasons: {
    nav: "تحليل الأسباب",
    title: "تحليل الأسباب",
    description: "العوامل الأكثر تأثيرًا في المغادرة المتوقعة وكيف تتوزع عبر القطاعات",
  },
  reports: {
    nav: "التقارير",
    title: "التقارير",
    description: "تصدير التقارير إلى Excel أو PDF مع احترام الفلاتر النشطة",
  },
};

const ICONS: Record<ViewId, React.ReactNode> = {
  overview: <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />,
  customers: <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />,
  prediction: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  "at-risk": (
    <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a1.8 1.8 0 0 0 1.5 2.7h17.4a1.8 1.8 0 0 0 1.5-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" />
  ),
  reasons: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.3-4.3" />,
  reports: <path d="M6 2h9l5 5v15H6zM15 2v5h5M9 13h6M9 17h6" />,
};

export function Sidebar({
  active,
  onNavigate,
  atRiskCount,
  isOpen,
  onClose,
}: {
  active: ViewId;
  onNavigate: (view: ViewId) => void;
  atRiskCount: number | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-30 bg-[rgb(6_14_22/0.5)] transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`no-print fixed inset-y-0 z-40 flex w-[15.5rem] shrink-0 flex-col bg-gradient-to-b from-ltt-navy to-[#081422] text-ink-on-dark transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ insetInlineStart: 0 }}
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ltt-accent to-ltt-primary text-[13px] font-extrabold text-white shadow-lg">
            LTT
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-extrabold text-white">
              Libya Telecom &amp; Technology
            </span>
            <span className="block text-[10.5px] text-[#8fb3d6]">
              لوحة تنبؤ مغادرة العملاء
            </span>
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="التنقل الرئيسي">
          {VIEWS.map((view) => {
            const isActive = view === active;
            return (
              <button
                key={view}
                type="button"
                onClick={() => onNavigate(view)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-[13px] font-bold transition-colors ${
                  isActive
                    ? "border-[rgb(0_174_239/0.35)] bg-[rgb(0_174_239/0.16)] text-white"
                    : "border-transparent text-[#b9cde3] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 shrink-0 opacity-85"
                  aria-hidden
                >
                  {ICONS[view]}
                </svg>
                <span className="min-w-0 flex-1">{VIEW_META[view].nav}</span>
                {view === "at-risk" && atRiskCount !== null && (
                  <span className="tnum shrink-0 rounded-full bg-critical px-1.5 py-px text-[10px] font-extrabold text-white">
                    {formatInt(atRiskCount)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-[10.5px] leading-relaxed text-[#7d9ab8]">
          <b className="mb-0.5 block text-[11.5px] text-[#c9defa]">
            نموذج تنبؤي تجريبي
          </b>
          بيانات اصطناعية بالكامل لأغراض التدريب. غير معتمدة للتشغيل الفعلي.
        </div>
      </aside>
    </>
  );
}

import type { Metadata } from "next";
import { Cairo } from "next/font/google";

import "./globals.css";

/**
 * Cairo is a variable font (weights 200–1000), so no `weight` is needed. The
 * `arabic` subset is what the interface is set in; `latin` is loaded too because
 * technical terms stay in Latin script by design — Churn, Customer ID, AUC, CSV.
 */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "لوحة تنبؤ مغادرة عملاء LTT",
  description:
    "تحليل وتوقع احتمالية مغادرة عملاء شركة الليبية للاتصالات والتقنية باستخدام نموذج تنبؤي، مع الإجراءات المقترحة للاحتفاظ بالعملاء.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

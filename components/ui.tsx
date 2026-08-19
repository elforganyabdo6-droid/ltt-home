import type { ReactNode } from "react";

import { RISK_LEVEL_LABELS, type RiskLevel } from "@/lib/taxonomy";

/** A titled card. `tag` carries the predicted-vs-actual provenance label. */
export function Panel({
  title,
  subtitle,
  tag,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  tag?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`print-full rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5 ${className}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tag}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * Provenance marker. The spec requires predicted churn to stay visibly distinct
 * from measured history, so every data panel wears one of these.
 */
export function DataKindTag({ kind }: { kind: "predicted" | "actual" }) {
  if (kind === "actual") {
    return (
      <span className="whitespace-nowrap rounded-full border border-border bg-surface-sunken px-2.5 py-0.5 text-[10.5px] font-bold text-ink-secondary">
        بيانات فعلية · تاريخية
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap rounded-full bg-accent-tint px-2.5 py-0.5 text-[10.5px] font-bold text-primary">
      تنبؤ النموذج
    </span>
  );
}

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-good-tint text-good-ink",
  medium: "bg-warning-tint text-warning-ink",
  high: "bg-critical-tint text-critical-ink",
};

const RISK_DOT: Record<RiskLevel, string> = {
  low: "bg-good",
  medium: "bg-warning",
  high: "bg-critical",
};

/**
 * Risk pill. The Arabic label is always present — it is the secondary encoding
 * that keeps risk readable when the amber and red are hard to tell apart.
 */
export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${RISK_STYLES[level]}`}
    >
      <span className={`size-1.5 rounded-full ${RISK_DOT[level]}`} />
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
}

/** Probability shown as a meter plus its number, tinted by risk band. */
export function ProbabilityMeter({
  probability,
  level,
}: {
  probability: number;
  level: RiskLevel;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
        <span
          className={`block h-full rounded-full ${RISK_DOT[level]}`}
          style={{ width: `${Math.min(Math.max(probability, 2), 100)}%` }}
        />
      </span>
      <b className="tnum text-ink">{probability.toFixed(0)}%</b>
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  type = "button",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    default:
      "border border-border bg-surface text-ink hover:border-border-strong",
    primary:
      "border border-primary bg-primary text-white hover:bg-primary-hover",
    ghost: "border border-transparent text-primary hover:bg-surface-sunken",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-12 text-center text-sm text-ink-muted">{message}</div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <p className="text-sm text-critical-ink">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="default">
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

/** Fixed-height skeleton, so loading does not shift the layout underneath. */
export function ChartSkeleton({ height = 230 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-xl bg-surface-sunken"
      style={{ height }}
      aria-hidden
    />
  );
}

export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-ink-secondary">{description}</p>
      )}
    </div>
  );
}

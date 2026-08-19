/**
 * Domain taxonomy for the LTT churn dashboard.
 *
 * Stored and transported values are stable ASCII keys so the API and database
 * stay language-neutral and URL-safe. Arabic labels live only in the *_LABELS
 * maps and are applied at render time.
 */

export const CUSTOMER_TYPES = ["individual", "business"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  individual: "أفراد",
  business: "شركات",
};

export const SUBSCRIPTION_TYPES = [
  "4g",
  "adsl",
  "vdsl",
  "fwa",
  "fiber",
  "libyaphone",
] as const;
export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number];

/** Product names stay in Latin script — that is how LTT staff read them. */
export const SUBSCRIPTION_TYPE_LABELS: Record<SubscriptionType, string> = {
  "4g": "4G",
  adsl: "ADSL",
  vdsl: "VDSL",
  fwa: "FWA",
  fiber: "Fiber",
  libyaphone: "Libya Phone",
};

export const PACKAGES = ["basic", "silver", "gold", "diamond"] as const;
export type Package = (typeof PACKAGES)[number];

export const PACKAGE_LABELS: Record<Package, string> = {
  basic: "الأساسية",
  silver: "الفضية",
  gold: "الذهبية",
  diamond: "الماسية",
};

/** Monthly subscription fee in Libyan dinar, before usage-based additions. */
export const PACKAGE_PRICE_LYD: Record<Package, number> = {
  basic: 45,
  silver: 85,
  gold: 150,
  diamond: 260,
};

export const REGIONS = [
  "tripoli",
  "benghazi",
  "misrata",
  "zawiya",
  "sabha",
  "bayda",
  "derna",
  "zliten",
  "tobruk",
  "gharyan",
] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  tripoli: "طرابلس",
  benghazi: "بنغازي",
  misrata: "مصراتة",
  zawiya: "الزاوية",
  sabha: "سبها",
  bayda: "البيضاء",
  derna: "درنة",
  zliten: "زليتن",
  tobruk: "طبرق",
  gharyan: "غريان",
};

export const USAGE_LEVELS = ["low", "medium", "high"] as const;
export type UsageLevel = (typeof USAGE_LEVELS)[number];

export const USAGE_LEVEL_LABELS: Record<UsageLevel, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
};

export const ACCOUNT_STATUSES = [
  "active",
  "suspended",
  "pending_cancellation",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "نشط",
  suspended: "إيقاف مؤقت",
  pending_cancellation: "قيد الإلغاء",
};

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
};

/**
 * Risk band boundaries, inclusive upper bounds on churn probability (0..100).
 * Matches the specification: low 0–30, medium 31–60, high 61–100.
 */
export const RISK_BANDS = { low: 30, medium: 60 } as const;

export function riskLevelFor(probability: number): RiskLevel {
  if (probability <= RISK_BANDS.low) return "low";
  if (probability <= RISK_BANDS.medium) return "medium";
  return "high";
}

export const CHURN_FACTORS = [
  "coverage",
  "usage_decline",
  "complaints",
  "price",
  "package_expiry",
  "short_tenure",
  "service_experience",
] as const;
export type ChurnFactor = (typeof CHURN_FACTORS)[number];

export const CHURN_FACTOR_LABELS: Record<ChurnFactor, string> = {
  coverage: "ضعف التغطية",
  usage_decline: "انخفاض الاستخدام",
  complaints: "الشكاوى المتكررة",
  price: "السعر",
  package_expiry: "انتهاء الباقة",
  short_tenure: "مدة الاشتراك القصيرة",
  service_experience: "تجربة الخدمة",
};

export const RETENTION_ACTIONS = [
  "custom_offer",
  "package_upgrade",
  "retention_discount",
  "contact_customer",
  "resolve_complaints",
  "improve_service",
  "follow_up",
] as const;
export type RetentionAction = (typeof RETENTION_ACTIONS)[number];

export const RETENTION_ACTION_LABELS: Record<RetentionAction, string> = {
  custom_offer: "عرض مخصص",
  package_upgrade: "ترقية الباقة",
  retention_discount: "خصم أو حافز للاحتفاظ بالعميل",
  contact_customer: "التواصل مع العميل",
  resolve_complaints: "معالجة الشكاوى",
  improve_service: "تحسين تجربة الخدمة",
  follow_up: "متابعة العميل",
};

/** The action recommended when a given factor is the dominant churn driver. */
export const FACTOR_ACTION: Record<ChurnFactor, RetentionAction> = {
  coverage: "resolve_complaints",
  usage_decline: "custom_offer",
  complaints: "contact_customer",
  price: "retention_discount",
  package_expiry: "package_upgrade",
  short_tenure: "follow_up",
  service_experience: "improve_service",
};

export const TENURE_BANDS = ["0-6", "6-12", "12-24", "24+"] as const;
export type TenureBand = (typeof TENURE_BANDS)[number];

export const TENURE_BAND_LABELS: Record<TenureBand, string> = {
  "0-6": "أقل من 6 أشهر",
  "6-12": "6 - 12 شهر",
  "12-24": "سنة - سنتين",
  "24+": "أكثر من سنتين",
};

export function tenureBandFor(months: number): TenureBand {
  if (months < 6) return "0-6";
  if (months < 12) return "6-12";
  if (months < 24) return "12-24";
  return "24+";
}

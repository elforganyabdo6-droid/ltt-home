/**
 * Deterministic synthetic subscriber generator.
 *
 * Every record here is fabricated. No real LTT subscriber data, MSISDN, national
 * ID, payment detail or CDR is used, and none may ever be added — see
 * SECURITY-CHECKLIST.md.
 *
 * Determinism matters: seeded from {@link DATASET_SEED}, this produces the same
 * 640 subscribers every run, so the database seed is reproducible and a bug found
 * on "LTT-100017" can be reproduced by anyone.
 */

import {
  CHURN_HISTORY_MONTHS,
  DATASET_AS_OF,
  DATASET_SEED,
  DATASET_SIZE,
} from "../constants";
import {
  PACKAGES,
  PACKAGE_PRICE_LYD,
  REGIONS,
  SUBSCRIPTION_TYPES,
  type AccountStatus,
  type CustomerType,
  type Package,
  type Region,
  type SubscriptionType,
  type UsageLevel,
} from "../taxonomy";
import type { Customer, MonthlyChurnActual } from "../types";

/** mulberry32 — small, fast, fully deterministic from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fabricated Arabic given names. Not drawn from any customer record. */
const GIVEN_NAMES = [
  "محمد", "أحمد", "علي", "عمر", "خالد", "يوسف", "إبراهيم", "سالم",
  "عبدالله", "مصطفى", "فاطمة", "مريم", "آمنة", "خديجة", "زينب", "هدى",
  "سعاد", "ليلى", "نور", "أسماء",
];

/** Fabricated family names. */
const FAMILY_NAMES = [
  "المصراتي", "الطرابلسي", "البرعصي", "الزنتاني", "الورفلي", "التاجوري",
  "الفيتوري", "الشريف", "المسماري", "السنوسي", "العابدي", "الغرياني",
];

/** Fabricated business names, for the `business` customer type. */
const BUSINESS_NAMES = [
  "شركة النخبة للتجارة", "مؤسسة الأمل الطبية", "شركة البحر المتوسط للنقل",
  "مجموعة الواحة الغذائية", "شركة الفتح للمقاولات", "مكتب الرؤية للاستشارات",
  "شركة السلام للأدوية", "مصنع الصحاري للبلاستيك", "شركة النور للطاقة",
  "مؤسسة البيان للنشر",
];

interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(pairs: readonly (readonly [T, number])[]): T;
}

function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  const range = (min: number, max: number) => min + next() * (max - min);
  const int = (min: number, max: number) => Math.floor(range(min, max + 1));
  return {
    next,
    range,
    int,
    pick: <T,>(items: readonly T[]): T => items[int(0, items.length - 1)],
    weighted: <T,>(pairs: readonly (readonly [T, number])[]): T => {
      const total = pairs.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [value, weight] of pairs) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return pairs[pairs.length - 1][0];
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Subtract whole months from an ISO date, returning an ISO date. */
function minusMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/**
 * Regional weighting. Tripoli and Benghazi hold most of the subscriber base, so
 * an even spread across ten regions would look obviously synthetic and would
 * make the per-region chart useless.
 */
const REGION_WEIGHTS: readonly (readonly [Region, number])[] = [
  ["tripoli", 0.3],
  ["benghazi", 0.19],
  ["misrata", 0.11],
  ["zawiya", 0.08],
  ["sabha", 0.07],
  ["bayda", 0.06],
  ["derna", 0.06],
  ["zliten", 0.05],
  ["tobruk", 0.05],
  ["gharyan", 0.03],
];

/**
 * Fixed-line technologies correlate with coverage complaints differently from
 * wireless ones. FWA and 4G carry more coverage trouble; Fiber carries least.
 */
const COVERAGE_RISK_BY_TECH: Record<SubscriptionType, number> = {
  "4g": 0.3,
  fwa: 0.34,
  adsl: 0.24,
  vdsl: 0.18,
  fiber: 0.07,
  libyaphone: 0.16,
};

export function generateCustomers(
  seed: number = DATASET_SEED,
  count: number = DATASET_SIZE,
): Customer[] {
  const rng = makeRng(seed);
  const customers: Customer[] = [];

  for (let i = 0; i < count; i++) {
    const customerType: CustomerType = rng.weighted([
      ["individual", 0.78],
      ["business", 0.22],
    ]);

    const subscriptionType: SubscriptionType = rng.pick(SUBSCRIPTION_TYPES);
    const region = rng.weighted(REGION_WEIGHTS);

    // Businesses skew to the higher packages; individuals to the lower ones.
    const pkg: Package =
      customerType === "business"
        ? rng.weighted([
            ["basic", 0.08],
            ["silver", 0.22],
            ["gold", 0.37],
            ["diamond", 0.33],
          ])
        : rng.weighted([
            ["basic", 0.34],
            ["silver", 0.33],
            ["gold", 0.24],
            ["diamond", 0.09],
          ]);

    const tenureMonths = rng.int(1, 60);

    const dataUsageLevel: UsageLevel = rng.weighted([
      ["low", 0.28],
      ["medium", 0.42],
      ["high", 0.3],
    ]);

    // Positive = declining usage. Low-usage accounts are the ones dropping off.
    const usageChangePct =
      dataUsageLevel === "low"
        ? rng.range(25, 70)
        : dataUsageLevel === "medium"
          ? rng.range(-5, 25)
          : rng.range(-25, 5);

    const coverageIssue = rng.next() < COVERAGE_RISK_BY_TECH[subscriptionType];

    // A coverage problem generates complaints, so the two are correlated rather
    // than independent — independent draws would break the driver analysis.
    const complaintBase = rng.range(-1.2, 5);
    const complaintsCount = Math.max(
      0,
      Math.round(complaintBase + (coverageIssue ? 1.8 : 0)),
    );

    const paymentDelays = Math.max(0, Math.round(rng.range(-1.5, 4)));
    const daysSinceInteraction = rng.int(1, 240);
    const packageExpiryDays = rng.int(0, 90);

    const status: AccountStatus = rng.weighted([
      ["active", 0.84],
      ["suspended", 0.1],
      ["pending_cancellation", 0.06],
    ]);

    // Usage-based revenue on top of the package fee.
    const usageUplift =
      dataUsageLevel === "high"
        ? rng.range(10, 60)
        : dataUsageLevel === "medium"
          ? rng.range(0, 25)
          : 0;

    const name =
      customerType === "business"
        ? rng.pick(BUSINESS_NAMES)
        : `${rng.pick(GIVEN_NAMES)} ${rng.pick(FAMILY_NAMES)}`;

    customers.push({
      id: `LTT-${100000 + i}`,
      name,
      customerType,
      subscriptionType,
      package: pkg,
      region,
      subscriptionStart: minusMonths(DATASET_AS_OF, tenureMonths),
      tenureMonths,
      monthlyRevenueLyd: Math.round(PACKAGE_PRICE_LYD[pkg] + usageUplift),
      dataUsageLevel,
      usageChangePct: Math.round(usageChangePct * 10) / 10,
      complaintsCount,
      coverageIssue,
      paymentDelays,
      daysSinceInteraction,
      packageExpiryDays,
      status,
      // Everyone in this table is a current subscriber. Measured churn lives in
      // monthly_churn_actuals — mixing the two is what the spec forbids.
      churnStatus: "active",
    });
  }

  return customers;
}

const MONTH_LABELS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function monthLabelAr(month: string): string {
  const index = Number(month.slice(5, 7)) - 1;
  return MONTH_LABELS_AR[index] ?? month;
}

/**
 * Measured monthly churn for the trailing year — historical fact in this
 * dataset's fiction, deliberately stored apart from predictions.
 *
 * A mild upward drift with a sharper lift in the last three months gives the
 * alert rules something real to fire on.
 */
export function generateMonthlyChurnActuals(
  seed: number = DATASET_SEED,
  months: number = CHURN_HISTORY_MONTHS,
): MonthlyChurnActual[] {
  const rng = makeRng(seed ^ 0x5f5f);
  const rows: MonthlyChurnActual[] = [];

  let rate = 2.1;
  let base = 9800;

  for (let i = months - 1; i >= 0; i--) {
    rate += rng.range(-0.15, 0.28);
    if (i <= 2) rate += 0.22;
    rate = clamp(rate, 1.2, 7.5);

    const customersStart = Math.round(base);
    const customersChurned = Math.round((customersStart * rate) / 100);

    rows.push({
      month: minusMonths(DATASET_AS_OF, i).slice(0, 7),
      customersStart,
      customersChurned,
      churnRatePct: Math.round(rate * 100) / 100,
    });

    // Net growth: acquisition outpaces churn, so the base still climbs.
    base = customersStart - customersChurned + rng.range(180, 420);
  }

  return rows;
}

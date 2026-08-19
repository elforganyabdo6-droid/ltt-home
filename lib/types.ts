import type {
  AccountStatus,
  ChurnFactor,
  CustomerType,
  Package,
  Region,
  RetentionAction,
  RiskLevel,
  SubscriptionType,
  UsageLevel,
} from "./taxonomy";

/** A subscriber record as stored. All values synthetic. */
export interface Customer {
  id: string;
  name: string;
  customerType: CustomerType;
  subscriptionType: SubscriptionType;
  package: Package;
  region: Region;
  subscriptionStart: string;
  tenureMonths: number;
  monthlyRevenueLyd: number;
  dataUsageLevel: UsageLevel;
  /** Percentage change in monthly usage. Positive means usage is declining. */
  usageChangePct: number;
  complaintsCount: number;
  coverageIssue: boolean;
  paymentDelays: number;
  daysSinceInteraction: number;
  packageExpiryDays: number;
  status: AccountStatus;
  /** Measured history, not a prediction. */
  churnStatus: "active" | "churned";
}

/** Per-factor contribution to a single subscriber's churn probability. */
export type FactorContributions = Record<ChurnFactor, number>;

/**
 * Model output for one subscriber. Forward-looking — never to be presented as
 * measured churn.
 */
export interface ChurnPrediction {
  customerId: string;
  /** 0..100 */
  churnProbability: number;
  riskLevel: RiskLevel;
  topFactor: ChurnFactor;
  recommendedAction: RetentionAction;
  factors: FactorContributions;
  /** 0..100 — how much weight to place on this probability. */
  confidence: number;
  modelVersion: string;
  predictedAt: string;
}

/** A subscriber joined with the current prediction — the main table row. */
export type CustomerWithPrediction = Customer & {
  prediction: ChurnPrediction;
};

/** One month of measured churn. Historical actuals, never predicted. */
export interface MonthlyChurnActual {
  month: string;
  customersStart: number;
  customersChurned: number;
  churnRatePct: number;
}

export interface Kpis {
  totalCustomers: number;
  atRiskCustomers: number;
  predictedChurnRatePct: number;
  highRiskCustomers: number;
  averageTenureMonths: number;
  revenueAtRiskLyd: number;
  totalMonthlyRevenueLyd: number;
  averageConfidencePct: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BreakdownRow {
  key: string;
  label: string;
  averageProbability: number;
  customerCount: number;
  atRiskCount: number;
  revenueAtRiskLyd: number;
}

export interface FactorRow {
  factor: ChurnFactor;
  label: string;
  /** Share of total observed factor weight, 0..100. */
  contributionPct: number;
  /** Subscribers for whom this factor is the dominant driver. */
  dominantForCount: number;
}

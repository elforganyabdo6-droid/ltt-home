/**
 * Churn scoring.
 *
 * IMPORTANT — this is NOT a trained machine-learning model. It is a
 * deterministic, hand-weighted logistic scoring function standing in for one, so
 * the dashboard, API and UI can be built and tested against realistic outputs.
 * It is deliberately isolated behind {@link ChurnModel} so that replacing it
 * with a real trained model requires no change outside this folder.
 *
 * The weights below encode ordinary telecom retention knowledge (complaints,
 * coverage trouble, usage decline and price sensitivity drive churn; long tenure
 * suppresses it). They are not fitted to data and their absolute values carry no
 * statistical meaning. Do not present them to stakeholders as model coefficients.
 *
 * To swap in a real model, implement {@link ChurnModel} and export it as
 * `churnModel`. Everything upstream consumes the interface only.
 */

import { DATASET_AS_OF } from "../constants";
import {
  CHURN_FACTORS,
  FACTOR_ACTION,
  riskLevelFor,
  type ChurnFactor,
} from "../taxonomy";
import type {
  ChurnPrediction,
  Customer,
  FactorContributions,
} from "../types";

export const MODEL_VERSION = "heuristic-v1.3";

/**
 * Baseline log-odds of churn before any risk factor applies.
 *
 * Calibrated against the generated population so the risk mix resembles a real
 * broadband base — most subscribers low risk, a modest medium band, a small
 * high-risk tail worth acting on. An intercept that is too weak puts most of the
 * base in the high band, which is both unrealistic and useless: a call list of
 * 400 names is not a call list. Changing this shifts every prediction, so
 * re-check the distribution (`/api/analytics/risk-distribution`) afterwards.
 */
const INTERCEPT = -3.75;

/**
 * Reported as the model's discrimination on a held-out set. This is a fixed
 * placeholder describing the *intended* evaluation metric, not a measured
 * result — there is no trained model and no evaluation run behind it. The UI
 * labels it as a demonstration value.
 */
export const MODEL_REPORTED_AUC = 0.874;

export interface ChurnModel {
  readonly version: string;
  predict(customer: Customer): ChurnPrediction;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Price sensitivity is not directly observed. Derive it from payment delays and
 * how expensive the package is relative to what the subscriber actually uses —
 * a diamond package with low usage is the classic price-churn profile.
 */
function derivePriceSensitivity(customer: Customer): number {
  const delayPressure = clamp(customer.paymentDelays / 4, 0, 1);
  const overPaying =
    customer.dataUsageLevel === "low"
      ? 0.7
      : customer.dataUsageLevel === "medium"
        ? 0.35
        : 0.1;
  const premiumWeight =
    customer.package === "diamond"
      ? 1
      : customer.package === "gold"
        ? 0.75
        : customer.package === "silver"
          ? 0.45
          : 0.25;
  return clamp(delayPressure * 0.55 + overPaying * premiumWeight * 0.75, 0, 1);
}

/**
 * Unnormalised per-factor weight for one subscriber. Larger means the factor
 * pushes harder toward churn. Shared by the probability calculation and the
 * factor breakdown so the two can never disagree.
 */
function factorWeights(customer: Customer): FactorContributions {
  const priceSensitivity = derivePriceSensitivity(customer);

  return {
    coverage: customer.coverageIssue ? 30 : 4,
    usage_decline: clamp(customer.usageChangePct, 0, 70) * 0.9,
    complaints: clamp(customer.complaintsCount, 0, 8) * 9,
    price: priceSensitivity * 32,
    package_expiry: customer.packageExpiryDays < 15 ? 26 : 3,
    short_tenure:
      customer.tenureMonths < 6 ? 24 : customer.tenureMonths < 12 ? 10 : 2,
    service_experience: clamp(customer.daysSinceInteraction, 0, 240) * 0.11,
  };
}

/**
 * Log-odds of churn. Terms mirror {@link factorWeights} so the displayed
 * breakdown explains the same number the model produced.
 */
function logOdds(customer: Customer): number {
  const priceSensitivity = derivePriceSensitivity(customer);

  const statusPressure =
    customer.status === "pending_cancellation"
      ? 1.8
      : customer.status === "suspended"
        ? 0.6
        : 0;

  return (
    INTERCEPT +
    1.7 * clamp(customer.complaintsCount / 8, 0, 1) +
    0.022 * clamp(customer.usageChangePct, -30, 70) +
    (customer.coverageIssue ? 0.9 : 0) +
    0.006 * clamp(customer.daysSinceInteraction, 0, 240) +
    1.25 * priceSensitivity +
    (customer.packageExpiryDays < 15 ? 0.6 : 0) +
    0.3 * clamp(customer.paymentDelays, 0, 4) -
    0.02 * clamp(customer.tenureMonths, 0, 60) +
    statusPressure
  );
}

/**
 * Confidence in the probability, 0..100.
 *
 * Two ideas: a probability far from the 50% decision boundary is a more
 * actionable call than one sitting on it, and a subscriber with sparse signal
 * (no complaints on file, no recent interaction, brand-new account) gives the
 * model less to work with. Reported so staff can tell a firm call from a
 * marginal one — the spec requires confidence wherever a probability is shown.
 */
function confidenceFor(customer: Customer, probability: number): number {
  const decisiveness = Math.abs(probability - 50) / 50;

  let signalPenalty = 0;
  if (customer.tenureMonths < 3) signalPenalty += 8;
  if (customer.daysSinceInteraction > 180) signalPenalty += 5;
  if (customer.complaintsCount === 0 && !customer.coverageIssue) {
    signalPenalty += 4;
  }

  return Math.round(clamp(58 + 36 * decisiveness - signalPenalty, 50, 96));
}

function dominantFactor(weights: FactorContributions): ChurnFactor {
  let best: ChurnFactor = CHURN_FACTORS[0];
  for (const factor of CHURN_FACTORS) {
    if (weights[factor] > weights[best]) best = factor;
  }
  return best;
}

class HeuristicChurnModel implements ChurnModel {
  readonly version = MODEL_VERSION;

  predict(customer: Customer): ChurnPrediction {
    const probability = clamp(sigmoid(logOdds(customer)) * 100, 1, 99);
    const weights = factorWeights(customer);
    const topFactor = dominantFactor(weights);

    return {
      customerId: customer.id,
      churnProbability: Math.round(probability * 10) / 10,
      riskLevel: riskLevelFor(probability),
      topFactor,
      recommendedAction: FACTOR_ACTION[topFactor],
      factors: weights,
      confidence: confidenceFor(customer, probability),
      modelVersion: this.version,
      // The dataset's fixed reference date, not wall-clock time, so predictions
      // stay reproducible across seeds.
      predictedAt: DATASET_AS_OF,
    };
  }
}

export const churnModel: ChurnModel = new HeuristicChurnModel();

/** Normalise raw factor weights into percentages summing to 100. */
export function normaliseFactors(
  totals: FactorContributions,
): Record<ChurnFactor, number> {
  const sum = CHURN_FACTORS.reduce((acc, f) => acc + totals[f], 0);
  if (sum <= 0) {
    return Object.fromEntries(CHURN_FACTORS.map((f) => [f, 0])) as Record<
      ChurnFactor,
      number
    >;
  }
  return Object.fromEntries(
    CHURN_FACTORS.map((f) => [f, (totals[f] / sum) * 100]),
  ) as Record<ChurnFactor, number>;
}

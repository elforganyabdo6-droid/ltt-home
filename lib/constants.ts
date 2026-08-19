/**
 * Fixed parameters of the synthetic dataset.
 *
 * The dataset is deterministic: the same seed and reference date always produce
 * byte-identical records. That makes the seeded database reproducible, so a
 * trainer and a trainee looking at "customer LTT-100017" are looking at the same
 * subscriber, and a failing test can be reproduced exactly.
 */

/** Seed for the dataset PRNG. Changing this regenerates every record. */
export const DATASET_SEED = 19731105;

/** Number of synthetic subscribers generated. */
export const DATASET_SIZE = 640;

/**
 * The date the dataset represents. Tenure, package expiry and "days since last
 * interaction" are all measured back from here, and predictions are stamped with
 * it. A fixed date rather than "today" keeps the data reproducible.
 */
export const DATASET_AS_OF = "2026-08-01";

/** Months of measured churn history generated for the trend chart. */
export const CHURN_HISTORY_MONTHS = 12;

import type { ScanGrade } from "@/lib/types/database";

import scoringConfig from "./v1.json";
import type { CheckRunResult } from "./types";

const RESULT_MULTIPLIER: Record<CheckRunResult["result"], number> = {
  pass: 1,
  partial: 0.5,
  fail: 0,
};

export interface ScoreResult {
  score: number;
  grade: ScanGrade;
  category_scores: Record<string, number>;
}

/**
 * Every check's weight is defined in v1.json as its share of the 100-point
 * total (a category's check weights sum to that category's percentage), so
 * summing earned points across all checks yields the overall score directly.
 */
export function computeScore(results: CheckRunResult[]): ScoreResult {
  const checkWeights = scoringConfig.checks as Record<string, { category: string; weight: number }>;
  const categoryEarned: Record<string, number> = {};
  const categoryMax: Record<string, number> = {};
  let score = 0;

  for (const result of results) {
    const config = checkWeights[result.id];
    if (!config) {
      throw new Error(`No scoring weight configured for check "${result.id}" in v1.json`);
    }
    const earned = config.weight * RESULT_MULTIPLIER[result.result];
    categoryEarned[config.category] = (categoryEarned[config.category] ?? 0) + earned;
    categoryMax[config.category] = (categoryMax[config.category] ?? 0) + config.weight;
    score += earned;
  }

  const category_scores: Record<string, number> = {};
  for (const category of scoringConfig.categories) {
    const earned = categoryEarned[category.id] ?? 0;
    const max = categoryMax[category.id] ?? category.weight;
    category_scores[category.id] = max > 0 ? Math.round((earned / max) * 100) : 0;
  }

  const roundedScore = Math.round(score);
  const grade = gradeFor(roundedScore);

  return { score: roundedScore, grade, category_scores };
}

function gradeFor(score: number): ScanGrade {
  const sorted = [...scoringConfig.grades].sort((a, b) => b.min - a.min);
  const match = sorted.find((g) => score >= g.min);
  return (match?.grade ?? "F") as ScanGrade;
}

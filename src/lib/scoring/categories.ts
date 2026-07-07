import scoringConfig from "./v1.json";

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  scoringConfig.categories.map((c) => [c.id, c.label]),
);

export const CATEGORY_ORDER: string[] = scoringConfig.categories.map((c) => c.id);

export type CategoryStatus = "pass" | "partial" | "fail";

export function categoryStatus(score: number): CategoryStatus {
  if (score >= 80) return "pass";
  if (score < 50) return "fail";
  return "partial";
}

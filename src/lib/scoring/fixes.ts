import type { ScanCheckEffort, ScanCheckResult } from "@/lib/types/database";

import { CHECKS } from "./checks";
import scoringConfig from "./v1.json";

export const CHECK_LABELS = new Map(CHECKS.map((c) => [c.id, c.label]));
const CHECK_WEIGHTS = scoringConfig.checks as Record<string, { category: string; weight: number }>;

const RESULT_MULTIPLIER: Record<ScanCheckResult, number> = {
  pass: 1,
  partial: 0.5,
  fail: 0,
};

const EFFORT_LABEL: Record<ScanCheckEffort, "Quick Win" | "2–3 Days" | "1 Week"> = {
  low: "Quick Win",
  med: "2–3 Days",
  high: "1 Week",
};

export interface PriorityFix {
  title: string;
  desc: string;
  effort: "Quick Win" | "2–3 Days" | "1 Week";
  impact: number;
}

interface CheckLike {
  check_id: string;
  result: ScanCheckResult;
  fix_text: string | null;
  effort: ScanCheckEffort | null;
}

/** Ranks non-passing checks by the score points recoverable by fixing them. */
export function computePriorityFixes(checks: CheckLike[], limit: number): PriorityFix[] {
  return checks
    .filter((c) => c.result !== "pass")
    .map((c) => {
      const weight = CHECK_WEIGHTS[c.check_id]?.weight ?? 0;
      const impact = Math.round(weight * (1 - RESULT_MULTIPLIER[c.result]));
      return {
        title: CHECK_LABELS.get(c.check_id) ?? c.check_id,
        desc: c.fix_text ?? "",
        effort: EFFORT_LABEL[c.effort ?? "med"],
        impact,
      };
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit);
}

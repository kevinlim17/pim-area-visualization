// Codeable subset of the taxonomy consistency checks. The same pure
// constraints also classify hypothetical Gap cells, preventing validation and
// visualization from drifting apart.

import type { Sidecar } from "../types/sidecar";
import { evaluateGapConstraints } from "./gapConstraints";

export interface ConsistencyViolation {
  check: string;
  message: string;
}

function tagValues(sidecar: Sidecar, axisKey: string): string[] {
  const block = sidecar.axes[axisKey];
  if (!block || !Array.isArray(block.tags)) return [];
  const values = block.tags.map((tag) => tag.v).filter((value) => value !== "Not addressed");
  if (
    axisKey === "5b_coherency" &&
    sidecar.not_addressed.some((entry) => entry.axis === axisKey && entry.silence === "Dissolved")
  ) {
    values.push("Dissolved");
  }
  return values;
}

export function runConsistencyChecks(sidecar: Sidecar): ConsistencyViolation[] {
  const values = Object.fromEntries(
    [
      "1_location",
      "2a_approach",
      "2b_technology",
      "3_programmability",
      "4a_parallelism",
      "4b_offload",
      "5b_coherency",
      "9a_hw_change",
      "11a_eval_method",
      "11c_validation",
    ].map((axisKey) => [axisKey, tagValues(sidecar, axisKey)])
  );

  return evaluateGapConstraints(values).map(({ ruleId, message }) => ({
    check: ruleId,
    message,
  }));
}

// UI-facing taxonomy descriptions. Content lives in axisTagDescriptions.json
// (undergrad-level Korean explanations grounded in axis-taxonomy.md v1.3's
// own definitions plus skills/pim-paper-12axis-digest/references/
// survey-anchors.md's background — the two "anchor" sources), so the copy
// can be reviewed/edited without touching TypeScript. This file only wires
// the JSON into the two lookups PaperInspector needs.
import rawDescriptions from "./axisTagDescriptions.json";

interface AxisEntry {
  axis: string;
  tags: Record<string, string>;
}

const DESCRIPTIONS = rawDescriptions as unknown as Record<string, AxisEntry | string>;

export const AXIS_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  Object.entries(DESCRIPTIONS)
    .filter((entry): entry is [string, AxisEntry] => typeof entry[1] !== "string")
    .map(([axisKey, entry]) => [axisKey, entry.axis])
);

export function describeTaxonomyTag(axisKey: string, tag: string): string {
  if (tag === "Not addressed") return "논문이 이 축을 직접 다루지 않았습니다.";
  if (tag.startsWith("Other: ")) {
    return `현재 taxonomy에 정식 승격되지 않은 논문 고유 분류입니다 (${tag.slice("Other: ".length)}).`;
  }
  const entry = DESCRIPTIONS[axisKey];
  const described = typeof entry === "string" ? undefined : entry?.tags[tag];
  return described ?? `taxonomy의 ${tag} 범주에 해당합니다 (아직 설명이 등록되지 않음).`;
}

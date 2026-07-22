import type { ConfirmedEdge, SuggestedEdge } from "./edgeEngine";
import { RELATION_DESCRIPTION, RELATION_LABEL } from "./edgeStyle";

export interface EdgeRelationDetail {
  key: string;
  title: string;
  relation: string;
  description: string;
  meta: string;
  suggested: boolean;
}

export function suggestedEdgeDetail(edge: SuggestedEdge): EdgeRelationDetail {
  return {
    key: `suggested:${edge.source}:${edge.target}`,
    title: `${edge.source} ↔ ${edge.target}`,
    relation: "유사도 기반 제안",
    description: "26개 분석 축에서 두 논문의 특성이 가까워 자동으로 제안된 연결입니다.",
    meta: `Gower 거리 ${edge.distance.toFixed(2)} · 검증된 인용 관계가 아닙니다.`,
    suggested: true,
  };
}

export function confirmedEdgeDetail(edge: ConfirmedEdge): EdgeRelationDetail {
  const source = edge.direction === "from_target" ? edge.target : edge.source;
  const target = edge.direction === "from_target" ? edge.source : edge.target;
  return {
    key: `confirmed:${edge.type}:${source}:${target}`,
    title: `${source} → ${target}`,
    relation: RELATION_LABEL[edge.type],
    description: edge.note ?? RELATION_DESCRIPTION[edge.type],
    meta: `${edge.note ? `${RELATION_DESCRIPTION[edge.type]} · ` : ""}${edge.reciprocal ? "양쪽 논문에서 확인된 관계" : "한쪽 논문에서만 명시된 관계"}${edge.distant ? " · 분석 축 거리는 크지만 명시적으로 연결됨" : ""}`,
    suggested: false,
  };
}

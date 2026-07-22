// Shared edge styling for 2D/3D renderers, per dev-plan §5.2's relation-type
// render table. One source of truth so ScatterCanvas and ThreeScatter never
// drift apart on what a color/dash means.
import type { RelationType } from "../types/sidecar";

export interface EdgeTypeStyle {
  color: string;
  dashed: boolean;
  arrow: boolean;
}

export const RELATION_STYLE: Record<RelationType, EdgeTypeStyle> = {
  premise: { color: "#3D3D3A", dashed: false, arrow: true },
  subsumes: { color: "#3D3D3A", dashed: false, arrow: true },
  competes: { color: "#c0392b", dashed: false, arrow: false },
  complements: { color: "#4b8b6f", dashed: false, arrow: false },
  disjoint: { color: "#c9c6b8", dashed: true, arrow: false },
  lineage: { color: "#6a4c93", dashed: true, arrow: true },
};

export const SUGGESTED_EDGE_STYLE: EdgeTypeStyle = { color: "#9c9a92", dashed: true, arrow: false };

export const RELATION_LABEL: Record<RelationType, string> = {
  premise: "전제·기반",
  subsumes: "포함·일반화",
  competes: "경쟁 관계",
  complements: "상호 보완",
  disjoint: "직접 비교 어려움",
  lineage: "아이디어 계보",
};

export const RELATION_DESCRIPTION: Record<RelationType, string> = {
  premise: "한 논문의 핵심 가정이나 기반 기술을 다른 논문이 활용합니다.",
  subsumes: "한 논문이 다른 논문의 접근 범위를 포함하거나 더 일반화합니다.",
  competes: "같은 문제를 서로 다른 대안 방식으로 해결합니다.",
  complements: "서로 다른 계층이나 기능을 다뤄 함께 사용할 때 보완됩니다.",
  disjoint: "문제 설정이나 설계 영역이 달라 직접 비교하기 어렵습니다.",
  lineage: "선행 논문의 아이디어가 후속 연구로 계승되거나 발전했습니다.",
};

export const CONFIRMED_STROKE_WIDTH = { close: 2.5, distant: 1.2 };
export const SUGGESTED_STROKE_WIDTH = 1;
export const ASYMMETRIC_OPACITY = 0.45;
export const CONFIRMED_OPACITY = 0.85;
export const SUGGESTED_OPACITY = 0.5;

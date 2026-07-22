import { AXIS_LABELS } from "../data/axisLabels";
import type { SetAxisKey, Sidecar } from "../types/sidecar";
import { computeSetOverlay, type SetOverlaySelection } from "../lib/setAxisEngine";

interface Props {
  nodes: Sidecar[];
  selection: SetOverlaySelection;
  onChange: (selection: SetOverlaySelection) => void;
}

const OPTIONS: Array<{ axis: SetAxisKey | null; short: string }> = [
  { axis: null, short: "없음" },
  { axis: "7a_solved", short: "7a 해결 병목" },
  { axis: "13_econ", short: "13 산업·경제" },
  { axis: "14_lineage", short: "14 아이디어 계보" },
];

export default function SetOverlaySelector({ nodes, selection, onChange }: Props) {
  const result = computeSetOverlay(nodes, selection);
  const availableCount = selection.axis
    ? [...result.nodes.values()].filter((state) => state.available).length
    : nodes.length;

  return (
    <fieldset className="set-overlay-selector">
      <legend>집합형 오버레이</legend>
      <p>노드 위치는 유지하고 선택한 집합의 소속 또는 확인된 계보를 강조합니다.</p>
      <div className="set-overlay-axis-options">
        {OPTIONS.map(({ axis, short }) => {
          const id = `set-overlay-${axis ?? "none"}`;
          return (
            <label key={id} htmlFor={id}>
              <input
                id={id}
                name="set-overlay-axis"
                type="radio"
                checked={selection.axis === axis}
                onChange={() => onChange({ axis, member: null })}
              />
              <span>{short}</span>
            </label>
          );
        })}
      </div>

      {selection.axis && (
        <div className="set-overlay-members">
          <div className="set-overlay-summary">
            <strong>{AXIS_LABELS[selection.axis]}</strong>
            <span>{availableCount}/{nodes.length}편 데이터</span>
          </div>
          {selection.axis === "14_lineage" ? (
            <p className="set-overlay-lineage-count">
              확인된 로컬 계보 {result.lineageEdgeCount}개 · 참여 논문 {result.matchedCount}편
            </p>
          ) : (
            <div className="set-member-options" role="radiogroup" aria-label={`${AXIS_LABELS[selection.axis]} 태그`}>
              <label htmlFor="set-member-all">
                <input
                  id="set-member-all"
                  name="set-overlay-member"
                  type="radio"
                  checked={selection.member === null}
                  onChange={() => onChange({ ...selection, member: null })}
                />
                <span>전체 보기</span>
                <small>{availableCount}편</small>
              </label>
              {result.members.map(({ value, count }) => {
                const id = `set-member-${selection.axis}-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                return (
                  <label key={value} htmlFor={id}>
                    <input
                      id={id}
                      name="set-overlay-member"
                      type="radio"
                      checked={selection.member === value}
                      onChange={() => onChange({ ...selection, member: value })}
                    />
                    <span>{value}</span>
                    <small>{count}편</small>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}

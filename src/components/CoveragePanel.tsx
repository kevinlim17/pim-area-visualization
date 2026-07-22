// Coverage panel (dev-plan §6.3): per-axis Not addressed ratio across the
// whole corpus, split by silence type — a collectively-silent axis is a
// candidate field-wide gap, not just one paper's.
import type { Sidecar, Silence } from "../types/sidecar";
import { AXIS_LABELS } from "../data/axisLabels";
import { isSilentOn, silenceTypeOn } from "../lib/gapEngine";
import { SILENCE_COLOR, MODE_COLOR } from "../lib/colors";
import type { SetOverlayResult } from "../lib/setAxisEngine";

const SILENCE_TYPES: Silence[] = ["OutOfScope", "Evaded", "Dissolved", "Anachronistic"];

export default function CoveragePanel({ nodes, overlay }: { nodes: Sidecar[]; overlay: SetOverlayResult }) {
  const total = nodes.length;

  if (total === 0) {
    return <p className="coverage-subtitle">표시된 논문이 없어 계산하지 않습니다.</p>;
  }

  return (
    <div className="coverage-panel">
      {overlay.selection.axis && (
        <section className="overlay-coverage" aria-label="집합형 오버레이 분포">
          <strong>오버레이 분포</strong>
          {overlay.selection.axis === "14_lineage" ? (
            <div className="overlay-coverage-summary">
              <span>계보 엣지 {overlay.lineageEdgeCount}개</span>
              <span>참여 {overlay.matchedCount}/{total}편</span>
            </div>
          ) : (
            <ul>
              {overlay.members.map((member) => (
                <li key={member.value} className={overlay.selection.member === member.value ? "is-selected" : ""}>
                  <span>{member.value}</span><strong>{member.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="coverage-subtitle">26축 × {total}편</p>
      <div className="coverage-rows">
        {Object.entries(AXIS_LABELS).map(([key, label]) => {
          const bySilenceType: Record<Silence | "unspecified", number> = {
            OutOfScope: 0,
            Evaded: 0,
            Dissolved: 0,
            Anachronistic: 0,
            unspecified: 0,
          };
          let filled = 0;
          for (const node of nodes) {
            if (isSilentOn(node, key)) {
              const type = silenceTypeOn(node, key);
              bySilenceType[type ?? "unspecified"]++;
            } else {
              filled++;
            }
          }
          return (
            <div key={key} className="coverage-row">
              <span className="coverage-label">{label}</span>
              <div className="coverage-bar">
                <div
                  className="coverage-seg"
                  style={{ width: `${(filled / total) * 100}%`, background: MODE_COLOR.standard }}
                  title={`채움 ${filled}/${total}`}
                />
                {SILENCE_TYPES.map((t) =>
                  bySilenceType[t] > 0 ? (
                    <div
                      key={t}
                      className="coverage-seg"
                      style={{ width: `${(bySilenceType[t] / total) * 100}%`, background: SILENCE_COLOR[t] }}
                      title={`${t} ${bySilenceType[t]}/${total}`}
                    />
                  ) : null
                )}
                {bySilenceType.unspecified > 0 && (
                  <div
                    className="coverage-seg"
                    style={{ width: `${(bySilenceType.unspecified / total) * 100}%`, background: "#e4e1d4" }}
                    title={`미분류 침묵 ${bySilenceType.unspecified}/${total}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { SetAxisKey, Sidecar } from "../types/sidecar";
import { AXIS_LABELS } from "../data/axisLabels";
import { AXIS_DESCRIPTIONS, describeTaxonomyTag } from "../data/axisTaxonomy";
import type { NodeWarning } from "../lib/dataLayer";
import { isSilentOn, silenceTypeOn } from "../lib/gapEngine";
import { projectAxis } from "../lib/projectionEngine";
import { SILENCE_COLOR } from "../lib/colors";
import { getSetAxisValues, normalizeLineageBlock, type SetOverlaySelection } from "../lib/setAxisEngine";

const SILENCE_LABEL = {
  OutOfScope: "범위 밖",
  Evaded: "회피",
  Dissolved: "해소",
  Anachronistic: "시대적 비해당",
} as const;

// file:// links from an http://localhost page are blocked by most browsers,
// so a clickable anchor would just be a broken promise. Copy-to-clipboard
// is the version of "digest round-trip" that actually works here.
function CopyPathRow({ label, path }: { label: string; path: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="digest-row">
      <span className="digest-path">
        {label}: {path}
      </span>
      <button
        type="button"
        className={status === "idle" ? "copy-btn" : `copy-btn ${status}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(path);
            setStatus("copied");
          } catch {
            setStatus("failed");
          }
          setTimeout(() => setStatus("idle"), 2000);
        }}
      >
        {status === "copied" ? "복사됨" : status === "failed" ? "복사 실패" : "경로 복사"}
      </button>
    </div>
  );
}

interface Props {
  node: Sidecar | null;
  axes: string[];
  warnings: NodeWarning[];
  overlaySelection: SetOverlaySelection;
}

const LINEAGE_SECTION_LABELS = {
  inherited: "계승한 아이디어",
  coined: "새로 제안한 아이디어",
  transmitted: "후속으로 전달",
  abandoned: "폐기한 아이디어",
} as const;

const LINEAGE_FORM_LABEL: Record<string, string> = {
  Direct: "직접 계승",
  Reinvented: "독립적 재발견",
  Transformed: "형태를 바꿔 계승",
  Reframed: "새 관점으로 재해석",
};

const ABANDON_REASON_LABEL: Record<string, string> = {
  TechnicallyFalsified: "기술적으로 반증됨",
  EconomicallyInfeasible: "경제적으로 실현하기 어려움",
  SupersededByBetter: "더 나은 방식으로 대체됨",
  Unknown: "이유 불명",
};

function SetAxisFact({ node, selection }: { node: Sidecar; selection: SetOverlaySelection }) {
  const axis = selection.axis as Exclude<SetAxisKey, "14_lineage">;
  const block = node.axes[axis];
  const values = getSetAxisValues(node, axis);
  const matched = selection.member ? values.includes(selection.member) : null;
  return (
    <section className="inspector-set-fact">
      <div className="inspector-section-heading">
        <strong>{AXIS_LABELS[axis]}</strong>
        <span>{values.length > 0 ? `${values.length}개 태그` : "데이터 없음"}</span>
      </div>
      {AXIS_DESCRIPTIONS[axis] && <p className="axis-taxonomy-summary">{AXIS_DESCRIPTIONS[axis]}</p>}
      {selection.member && (
        <p className={`set-match-status ${matched ? "is-match" : "is-nonmatch"}`}>
          {matched ? `선택 태그 “${selection.member}”에 해당합니다.` : `선택 태그 “${selection.member}”에 해당하지 않습니다.`}
        </p>
      )}
      {values.length === 0 ? (
        <p className="inspector-silence-empty">이 논문에는 해당 축 데이터가 없습니다.</p>
      ) : (
        <div className="axis-tag-list">
          {values.map((value) => {
            const tag = block?.tags?.find((item) => item.v === value);
            return (
              <div className="axis-tag-description" key={value}>
                <div className="axis-tag-heading">
                  <span className="axis-tag-value">{value}</span>
                  {tag?.primary && <small className="axis-tag-kind">대표 주장</small>}
                </div>
                <p>{describeTaxonomyTag(axis, value)}</p>
                {tag?.note && <p className="axis-tag-note">논문별 설명 · {tag.note}</p>}
              </div>
            );
          })}
        </div>
      )}
      {(block?.note || block?.evidence) && (
        <details className="axis-source-details">
          <summary>근거 확인</summary>
          {block.note && <p><strong>해석</strong>{block.note}</p>}
          {block.evidence && <p><strong>근거</strong>{block.evidence}</p>}
        </details>
      )}
    </section>
  );
}

function LineageFact({ node }: { node: Sidecar }) {
  const lineage = normalizeLineageBlock(node);
  const groups = [
    { key: "inherited", items: lineage.inherited },
    { key: "coined", items: lineage.coined },
    { key: "transmitted", items: lineage.transmitted },
    { key: "abandoned", items: lineage.abandoned },
  ] as const;
  return (
    <section className="inspector-set-fact lineage-fact">
      <div className="inspector-section-heading">
        <strong>{AXIS_LABELS["14_lineage"]}</strong>
        <span>확인된 relation만 캔버스 연결</span>
      </div>
      {AXIS_DESCRIPTIONS["14_lineage"] && <p className="axis-taxonomy-summary">{AXIS_DESCRIPTIONS["14_lineage"]}</p>}
      <div className="lineage-groups">
        {groups.map(({ key, items }) => (
          <section key={key} className="lineage-group">
            <h4>{LINEAGE_SECTION_LABELS[key]} <span>{items.length}</span></h4>
            {items.length === 0 ? <p className="lineage-empty">기록 없음</p> : (
              <ul>
                {items.map((item, index) => {
                  const form = "form" in item && item.form ? LINEAGE_FORM_LABEL[item.form] ?? item.form : null;
                  const reason = "why" in item && item.why ? ABANDON_REASON_LABEL[item.why] ?? item.why : null;
                  return (
                    <li key={`${key}-${index}`}>
                      <span>{item.text}</span>
                      {(form || reason) && <small>{form ?? reason}</small>}
                      {item.note && <p>{item.note}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
      {(lineage.note || lineage.evidence) && (
        <details className="axis-source-details">
          <summary>계보 근거</summary>
          {lineage.note && <p><strong>해석</strong>{lineage.note}</p>}
          {lineage.evidence && <p><strong>근거</strong>{lineage.evidence}</p>}
        </details>
      )}
    </section>
  );
}

function AxisFact({ node, axisKey, role }: { node: Sidecar; axisKey: string; role: string }) {
  const block = node.axes[axisKey];
  const proj = projectAxis(node, axisKey);
  const sourceTags = block?.artifact ?? block?.tags ?? [];
  return (
    <section className={`inspector-axis-fact inspector-axis-${role.toLowerCase()}`}>
      <div className="inspector-axis-heading">
        <span className={`axis-role axis-role-${role.toLowerCase()}`}>{role}</span>
        <strong>{AXIS_LABELS[axisKey]}</strong>
      </div>
      <p className="axis-taxonomy-summary">{AXIS_DESCRIPTIONS[axisKey]}</p>
      <div className="axis-tag-list">
        {proj.tags.map((tag) => (
          <div className="axis-tag-description" key={tag}>
            <div className="axis-tag-heading">
              <span className="axis-tag-value">{tag}</span>
              {tag !== "Not addressed" && (
                <small className="axis-tag-kind">
                  {sourceTags.find((item) => item.v === tag)?.primary || proj.anchorKind === "single"
                    ? "대표 위치"
                    : proj.anchorKind === "centroid"
                      ? "포괄 영역"
                      : "추가 영역"}
                </small>
              )}
            </div>
            <p>{describeTaxonomyTag(axisKey, tag)}</p>
          </div>
        ))}
      </div>
      {proj.lane === "silence" && proj.silenceType && (
        <div className="silence-note">침묵 유형 · {SILENCE_LABEL[proj.silenceType]}</div>
      )}
      {(block?.evidence || block?.explored) && (
        <details className="axis-source-details">
          <summary>근거 및 탐색 범위</summary>
          {block?.evidence && <p><strong>근거</strong>{block.evidence}</p>}
          {block?.explored && <p><strong>탐색 범위</strong>{block.explored}</p>}
        </details>
      )}
    </section>
  );
}

function SilenceSummary({ node }: { node: Sidecar }) {
  const silentAxes = Object.entries(AXIS_LABELS)
    .filter(([axisKey]) => isSilentOn(node, axisKey))
    .map(([axisKey, label]) => ({ axisKey, label, type: silenceTypeOn(node, axisKey) }));

  return (
    <section className="inspector-silence" aria-labelledby="silence-summary-title">
      <div className="inspector-silence-heading">
        <strong id="silence-summary-title">침묵 축</strong>
        <span>{silentAxes.length}/{Object.keys(AXIS_LABELS).length}</span>
      </div>
      {silentAxes.length === 0 ? (
        <p className="inspector-silence-empty">모든 축이 채워져 있습니다.</p>
      ) : (
        <ul>
          {silentAxes.map(({ axisKey, label, type }) => (
            <li key={axisKey}>
              <span
                className="silence-dot"
                style={{ background: type ? SILENCE_COLOR[type] : "#c9c6b8" }}
                aria-hidden="true"
              />
              <span className="silence-axis-label">{label}</span>
              <span className="silence-type-label">{type ? SILENCE_LABEL[type] : "미분류"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PaperInspector({ node, axes, warnings, overlaySelection }: Props) {
  if (!node) {
    return (
      <div className="inspector inspector-empty">
        <p>노드를 클릭하면 상세 정보가 여기 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="inspector">
      <header className="inspector-header">
        <span className="inspector-eyebrow">선택한 논문</span>
        <h2>{node.id}</h2>
        <p className="inspector-title">{node.title}</p>
        <div className="inspector-meta">
          <span>{node.year}</span>
          <span className={`mode-badge mode-${node.mode}`}>{node.mode}</span>
        </div>
      </header>

      <section className="inspector-summary" aria-labelledby="paper-summary-title">
        <strong id="paper-summary-title">핵심 요약</strong>
        <p>{node.one_line}</p>
      </section>

      <SilenceSummary node={node} />

      <section className="inspector-axis-section" aria-labelledby="selected-axis-title">
        <div className="inspector-section-heading">
          <strong id="selected-axis-title">선택 축 해석</strong>
          <span>{axes.length}개</span>
        </div>
        {axes.map((axisKey, index) => (
          <AxisFact key={axisKey} node={node} axisKey={axisKey} role={["X", "Y", "Z"][index] ?? `${index + 1}`} />
        ))}
      </section>

      {overlaySelection.axis && (
        <section className="inspector-overlay-section" aria-labelledby="selected-overlay-title">
          <div className="inspector-section-heading">
            <strong id="selected-overlay-title">집합형 오버레이 해석</strong>
            <span>{overlaySelection.axis === "14_lineage" ? "계보" : "태그 집합"}</span>
          </div>
          {overlaySelection.axis === "14_lineage"
            ? <LineageFact node={node} />
            : <SetAxisFact node={node} selection={overlaySelection} />}
        </section>
      )}

      {(node.digest || node.file) && (
        <details className="inspector-disclosure">
          <summary>문서 경로</summary>
          <div className="inspector-digest">
            {node.digest && <CopyPathRow label="다이제스트" path={node.digest} />}
            {node.file && <CopyPathRow label="원문" path={node.file} />}
          </div>
        </details>
      )}

      {warnings.length > 0 && (
        <details className="inspector-disclosure inspector-warnings">
          <summary>검증 경고 <span>{warnings.length}건</span></summary>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>[{w.kind}] {w.message}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

import type { Sidecar } from "../types/sidecar";

interface Props {
  nodes: Sidecar[];
  hiddenIds: ReadonlySet<string>;
  axisHiddenIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export default function PaperVisibilityToggle({ nodes, hiddenIds, axisHiddenIds, onToggle }: Props) {
  const visibleCount = nodes.filter((node) => !hiddenIds.has(node.id) && !axisHiddenIds.has(node.id)).length;

  return (
    <section className="paper-visibility" aria-labelledby="paper-visibility-title">
      <div className="paper-visibility-heading">
        <h2 id="paper-visibility-title">논문 표시</h2>
        <span>{visibleCount}/{nodes.length}편</span>
      </div>
      <p className="paper-visibility-note">
        선택 축 값이 없는 논문 {axisHiddenIds.size}편은 자동 제외됩니다. 수동 숨김 상태는 별도로 유지됩니다.
      </p>
      <ul className="paper-visibility-list">
        {nodes.map((node) => {
          const axisHidden = axisHiddenIds.has(node.id);
          const visible = !hiddenIds.has(node.id) && !axisHidden;
          const state = axisHidden ? "축 제외" : visible ? "표시" : "숨김";
          return (
            <li key={node.id} className={visible ? "" : `is-hidden${axisHidden ? " is-axis-hidden" : ""}`}>
              <label>
                <span className="paper-visibility-name" title={node.id}>{node.id}</span>
                <span className="paper-visibility-state">{state}</span>
                <input
                  className="paper-visibility-toggle"
                  type="checkbox"
                  role="switch"
                  checked={visible}
                  disabled={axisHidden}
                  aria-label={`${node.id} 표시${axisHidden ? " (선택 축 값 없음)" : ""}`}
                  onChange={() => onToggle(node.id)}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

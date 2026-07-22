import { AXIS_LABELS } from "../data/axisLabels";
import { axisType, hasAxisValue, isSelectable, type AxisType } from "../lib/axisRegistry";
import type { Sidecar } from "../types/sidecar";

const TYPE_BADGE: Record<AxisType, string> = {
  ordinal: "순서형",
  nominal: "명목형",
  binary: "이진",
  set: "집합형",
};

const MAX_AXES = 3;

interface Props {
  nodes: Sidecar[];
  selectedAxes: string[];
  onChange: (next: string[]) => void;
}

export default function AxisSelector({ nodes, selectedAxes, onChange }: Props) {
  const allKeys = Object.keys(AXIS_LABELS).filter((key) => axisType(key) !== "set");
  const atMax = selectedAxes.length >= MAX_AXES;
  const dimLabel = ["", "1D", "2D", "3D"][selectedAxes.length] ?? "";

  function toggle(key: string) {
    if (selectedAxes.includes(key)) {
      onChange(selectedAxes.filter((k) => k !== key));
    } else if (!atMax) {
      onChange([...selectedAxes, key]);
    }
  }

  return (
    <div className="axis-selector">
      <h2>축 선택 (최대 3, 현재 {dimLabel})</h2>
      <p className="axis-selector-note">
        축을 선택하면 해당 값이 없는 논문은 자동으로 숨겨집니다. 선택 순서대로 X·Y·Z에 배치됩니다.
      </p>
      <ul className="axis-checklist">
        {allKeys.map((key) => {
          const selectable = isSelectable(key) && nodes.some((node) => hasAxisValue(node, key));
          const checked = selectedAxes.includes(key);
          const order = selectedAxes.indexOf(key);
          const disabled = !selectable || (!checked && atMax);
          return (
            <li key={key} className={disabled ? "axis-checklist-item disabled" : "axis-checklist-item"}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(key)}
                />
                <span className="axis-checklist-label">{AXIS_LABELS[key]}</span>
                <span className="axis-type-badge">{TYPE_BADGE[axisType(key)]}</span>
                {checked && <span className="axis-order-badge">{["X", "Y", "Z"][order]}</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 1D projection (dev-plan §4.6): horizontal axis + beeswarm jitter so nodes
// that land on the same slot don't overlap. Silence lane at the left end.
import { scaleLinear } from "d3-scale";
import type { Sidecar } from "../types/sidecar";
import { getAxisSlots } from "../lib/axisRegistry";
import { AXIS_LABELS } from "../data/axisLabels";
import { projectNodes, SILENCE_T, OFF_HIERARCHY_T, type AxisProjection } from "../lib/projectionEngine";
import { SILENCE_COLOR, MODE_COLOR, AXIS_COLOR, GAP_COLOR } from "../lib/colors";
import { computeGrid } from "../lib/gapEngine";
import { nodeOverlayOpacity, type SetOverlayResult } from "../lib/setAxisEngine";

const WIDTH = 760;
const HEIGHT = 400;
const MARGIN = { top: 32, right: 32, bottom: 96, left: 32 };
const DOMAIN_MIN = -0.26;
const DOMAIN_MAX = 1.06;
const ROW_HEIGHT = 22;
const COLLISION_PX = 20;

interface Props {
  nodes: Sidecar[];
  axis: string;
  selectedId: string | null;
  focusId: string | null;
  overlay: SetOverlayResult;
  onSelect: (id: string) => void;
  onFocusToggle: (id: string) => void;
}

export default function OneDStrip({ nodes, axis, selectedId, focusId, overlay, onSelect, onFocusToggle }: Props) {
  const projected = projectNodes(nodes, [axis]);
  const activeProjection = projected.find((node) => node.id === (focusId ?? selectedId));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const axisDef = getAxisSlots(axis);
  const gapGrid = computeGrid(nodes, [axis]);

  const xScale = scaleLinear().domain([DOMAIN_MIN, DOMAIN_MAX]).range([MARGIN.left, WIDTH - MARGIN.right]);
  const baseline = HEIGHT - MARGIN.bottom;

  // Beeswarm: sort by pixel position, stack overlapping nodes upward in lanes.
  const withPx = projected
    .map((p) => ({ ...p, px: xScale(p.axes[0].t) }))
    .sort((a, b) => a.px - b.px);
  const lanes: number[] = []; // last px placed at each lane
  const laneOf = new Map<string, number>();
  for (const p of withPx) {
    let lane = lanes.findIndex((lastPx) => p.px - lastPx > COLLISION_PX);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = p.px;
    laneOf.set(p.id, lane);
  }

  return (
    <div className="scatter-wrap">
      <div className="scatter-stage">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="PIM 논문 1축 beeswarm">
        <rect
          x={xScale(DOMAIN_MIN)}
          y={MARGIN.top}
          width={xScale(0) - xScale(DOMAIN_MIN)}
          height={baseline - MARGIN.top}
          fill="#efece2"
        />
        <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={baseline} y2={baseline} stroke="#d8d5c8" />

        {gapGrid.cells.map((cell) => {
          const index = cell.indices[0];
          const t = gapGrid.shape[0] === 1 ? 0.5 : index / (gapGrid.shape[0] - 1);
          const px = xScale(t);
          const step = gapGrid.shape[0] > 1 ? (xScale(1) - xScale(0)) / (gapGrid.shape[0] - 1) : 60;
          const occupied = cell.count > 0;
          return (
            <rect
              key={`coverage-${cell.key}`}
              x={px - step / 2}
              y={baseline - 7}
              width={step}
              height={7}
              fill={occupied ? GAP_COLOR.occupiedHigh : "#fbfaf6"}
              fillOpacity={occupied ? 0.2 + 0.24 * (cell.count / Math.max(1, gapGrid.maxCount)) : 1}
              stroke={occupied ? GAP_COLOR.occupiedHigh : GAP_COLOR.unknown}
              strokeOpacity={occupied ? 0.75 : 0.7}
              strokeWidth={0.8}
            >
              <title>{occupied
                ? `${cell.axisValues[axis]}: ${cell.count}편 (${cell.paperIds.join(", ")})`
                : `${cell.axisValues[axis]}: 미관측 (표본 ${nodes.length}편)`}</title>
            </rect>
          );
        })}

        {axisDef?.order.map((tag, i, arr) => {
          const t = arr.length === 1 ? 0.5 : i / (arr.length - 1);
          const px = xScale(t);
          const isActiveTag = activeProjection?.axes[0].tags.includes(tag) ?? false;
          return (
            <g key={tag}>
              <line x1={px} x2={px} y1={MARGIN.top} y2={baseline} stroke="#ece9dd" />
              <text
                x={px}
                y={baseline + 14}
                fontSize={11}
                textAnchor="end"
                transform={`rotate(-40 ${px} ${baseline + 14})`}
                fill={activeProjection ? (isActiveTag ? "#242421" : "#b9b6ad") : "#3D3D3A"}
                fontWeight={isActiveTag ? 600 : 400}
              >
                {tag}
              </text>
            </g>
          );
        })}

        <text x={xScale(SILENCE_T)} y={MARGIN.top - 10} fontSize={10} textAnchor="middle" fill="#9c9a92">
          silence
        </text>
        <text x={xScale(OFF_HIERARCHY_T)} y={MARGIN.top - 10} fontSize={10} textAnchor="middle" fill="#9c9a92">
          off-hier.
        </text>

        {withPx.map((p) => {
          const node = byId.get(p.id)!;
          const proj = p.axes[0];
          const lane = laneOf.get(p.id) ?? 0;
          const cy = baseline - 10 - lane * ROW_HEIGHT;
          const color =
            proj.lane === "silence" && proj.silenceType
              ? SILENCE_COLOR[proj.silenceType]
              : MODE_COLOR[node.mode];
          const selected = p.id === selectedId;
          const focused = p.id === focusId;
          const inactive = focusId !== null && !focused;
          const overlayState = overlay.nodes.get(p.id);
          const overlayActive = Boolean(overlay.selection.axis && (overlay.selection.axis === "14_lineage" || overlay.selection.member));
          return (
            <g
              key={p.id}
              role="button"
              tabIndex={inactive ? -1 : 0}
              aria-pressed={focused}
              aria-label={`${node.id}. 클릭하여 상세 보기, 두 번 클릭하여 강조 모드 전환`}
              onClick={inactive ? undefined : (event) => {
                if (event.detail >= 2) onFocusToggle(p.id);
                else onSelect(p.id);
              }}
              onKeyDown={inactive ? undefined : (event) => {
                if (event.key === "Enter") onFocusToggle(p.id);
                if (event.key === " ") {
                  event.preventDefault();
                  onSelect(p.id);
                }
              }}
              style={{ cursor: inactive ? "default" : "pointer" }}
              opacity={selected || focused ? 1 : nodeOverlayOpacity(overlay, p.id, focusId)}
            >
              <title>{`${node.id}\n${proj.tags.join(", ")}${overlayActive ? `\n오버레이: ${overlayState?.matched ? "일치" : overlayState?.available ? "불일치" : "데이터 없음"}` : ""}`}</title>
              <OneDCoverageRail projection={proj} anchorX={p.px} y={cy} xScale={xScale} />
              {overlayActive && overlayState?.matched && (
                <circle cx={p.px} cy={cy} r={10.5} fill="none" stroke="#16766b" strokeWidth={2} strokeDasharray={overlay.selection.axis === "14_lineage" ? "3,2" : undefined} />
              )}
              <circle
                cx={p.px}
                cy={cy}
                r={selected || focused ? 8 : 6}
                fill={color}
                stroke={selected || focused ? "#3D3D3A" : "#fff"}
                strokeWidth={selected || focused ? 2 : 1.5}
              />
              {!inactive && (
                <text x={p.px + 9} y={cy + 3} fontSize={10} fill="#3D3D3A">
                  {node.id}
                </text>
              )}
            </g>
          );
        })}

        <text x={(MARGIN.left + WIDTH - MARGIN.right) / 2} y={HEIGHT - 8} fontSize={13} textAnchor="middle" fill="#3D3D3A">
          {AXIS_LABELS[axis]} →
        </text>
      </svg>
      </div>
      <p className="coverage-hint">축의 띠는 슬롯별 점유 밀도입니다. 채운 점은 대표 위치, 빈 점은 같은 논문의 추가 태그입니다.</p>
    </div>
  );
}

function OneDCoverageRail({
  projection,
  anchorX,
  y,
  xScale,
}: {
  projection: AxisProjection;
  anchorX: number;
  y: number;
  xScale: (t: number) => number;
}) {
  if (!projection.values || projection.values.length < 2) return null;
  const visibleValues = projection.values.filter(
    (value) => projection.anchorKind === "centroid" || Math.abs(value.t - projection.t) > 1e-6
  );
  return (
    <g aria-label={`복수 영역: ${projection.values.map((value) => value.tag).join(", ")}`}>
      {visibleValues.map((value) => {
        const x = xScale(value.t);
        return (
          <g key={value.tag}>
            <line x1={anchorX} x2={x} y1={y} y2={y} stroke={AXIS_COLOR[0]} strokeWidth={1.4} strokeDasharray="3,3" opacity={0.65} />
            <circle cx={x} cy={y} r={3.5} fill="#fbfaf6" stroke={AXIS_COLOR[0]} strokeWidth={1.5}>
              <title>{`추가 영역: ${value.tag}${projection.anchorKind === "centroid" ? " · 대표 노드는 태그들의 중심값" : ""}`}</title>
            </circle>
          </g>
        );
      })}
    </g>
  );
}

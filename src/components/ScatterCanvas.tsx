import { scaleLinear } from "d3-scale";
import type { RelationType, Sidecar, Silence } from "../types/sidecar";
import { getAxisSlots } from "../lib/axisRegistry";
import { AXIS_LABELS } from "../data/axisLabels";
import { projectNodes, SILENCE_T, OFF_HIERARCHY_T, type ProjectedNode } from "../lib/projectionEngine";
import { SILENCE_COLOR, MODE_COLOR, AXIS_COLOR, GAP_COLOR } from "../lib/colors";
import {
  computeEdges,
  type ConfirmedEdge,
  type SuggestedEdge,
} from "../lib/edgeEngine";
import {
  RELATION_STYLE,
  SUGGESTED_EDGE_STYLE,
  CONFIRMED_STROKE_WIDTH,
  SUGGESTED_STROKE_WIDTH,
  CONFIRMED_OPACITY,
  SUGGESTED_OPACITY,
  ASYMMETRIC_OPACITY,
  RELATION_LABEL,
} from "../lib/edgeStyle";
import { computeGrid } from "../lib/gapEngine";
import {
  edgeOverlayOpacity,
  nodeOverlayOpacity,
  type SetOverlayResult,
} from "../lib/setAxisEngine";
import { confirmedEdgeDetail, suggestedEdgeDetail, type EdgeRelationDetail } from "../lib/edgeDetail";
import EdgeRelationPanel from "./EdgeRelationPanel";

const WIDTH = 760;
const HEIGHT = 600;
// Long taxonomy labels live between the plot and the axis titles. Keep the
// title bands separate so neither X nor Y content reads as part of the title.
const MARGIN = { top: 32, right: 30, bottom: 132, left: 154 };
const DOMAIN_MIN = -0.26;
const DOMAIN_MAX = 1.06;
const COLLISION_RADIUS = 18;
const [X_AXIS_COLOR, Y_AXIS_COLOR] = AXIS_COLOR;
const COORDINATE_GROUP_COLORS = ["#287f8b", "#8a5a9b", "#b17a22", "#3f6fa0", "#a04d65", "#56834b"];

interface NodeLabelPlacement {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  leader: boolean;
  visible: boolean;
}

interface CoordinateGroup {
  key: string;
  color: string;
  center: [number, number];
  radius: number;
  ids: string[];
}

interface Props {
  nodes: Sidecar[];
  xAxis: string;
  yAxis: string;
  selectedId: string | null;
  focusId: string | null;
  overlay: SetOverlayResult;
  onSelect: (id: string) => void;
  onFocusToggle: (id: string) => void;
  hideDisjoint: boolean;
  onHideDisjointChange: (value: boolean) => void;
  edgeDetail: EdgeRelationDetail | null;
  onEdgeDetailChange: (detail: EdgeRelationDetail | null) => void;
}

export default function ScatterCanvas({ nodes, xAxis, yAxis, selectedId, focusId, overlay, onSelect, onFocusToggle, hideDisjoint, onHideDisjointChange, edgeDetail, onEdgeDetailChange }: Props) {
  const projected = projectNodes(nodes, [xAxis, yAxis]);
  const activeProjection = projected.find((node) => node.id === (focusId ?? selectedId));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const { confirmed, suggested } = computeEdges(nodes);
  const visibleConfirmed = hideDisjoint ? confirmed.filter((e) => e.type !== "disjoint") : confirmed;

  const xScale = scaleLinear().domain([DOMAIN_MIN, DOMAIN_MAX]).range([MARGIN.left, WIDTH - MARGIN.right]);
  // SVG y grows downward; flip so higher t renders higher on screen.
  const yScale = scaleLinear().domain([DOMAIN_MIN, DOMAIN_MAX]).range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  const coordinateLayout = layoutCoincidentNodes(projected, xScale, yScale);
  const displayPosById = coordinateLayout.positions;
  const labelPosById = layoutNodeLabels(nodes, displayPosById, focusId ?? selectedId);

  const xAxisDef = getAxisSlots(xAxis);
  const yAxisDef = getAxisSlots(yAxis);
  const gapGrid = computeGrid(nodes, [xAxis, yAxis]);
  const cellStepX = xAxisDef && xAxisDef.order.length > 1 ? (xScale(1) - xScale(0)) / (xAxisDef.order.length - 1) : 60;
  const cellStepY = yAxisDef && yAxisDef.order.length > 1 ? (yScale(0) - yScale(1)) / (yAxisDef.order.length - 1) : 60;

  return (
    <div className="scatter-wrap">
      <div className="scatter-stage">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="PIM 논문 2축 산점도">
        <defs>
          <marker id="arrow-premise" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={RELATION_STYLE.premise.color} />
          </marker>
          <marker id="arrow-lineage" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={RELATION_STYLE.lineage.color} />
          </marker>
        </defs>
        {/* silence lane shading */}
        <rect
          x={xScale(DOMAIN_MIN)}
          y={MARGIN.top}
          width={xScale(0) - xScale(DOMAIN_MIN)}
          height={HEIGHT - MARGIN.top - MARGIN.bottom}
          fill="#efece2"
        />
        <rect
          x={MARGIN.left}
          y={yScale(0)}
          width={WIDTH - MARGIN.left - MARGIN.right}
          height={yScale(DOMAIN_MIN) - yScale(0)}
          fill="#efece2"
        />

        {/* plot border */}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={WIDTH - MARGIN.left - MARGIN.right}
          height={HEIGHT - MARGIN.top - MARGIN.bottom}
          fill="none"
          stroke="#d8d5c8"
        />

        {/* occupied density + empty-cell Gap heatmap (dev-plan §6.2) */}
        {gapGrid.cells.map((cell) => {
          const [xIndex, yIndex] = cell.indices;
          const cx = xScale(xAxisDef!.order.length === 1 ? 0.5 : xIndex / (xAxisDef!.order.length - 1));
          const cy = yScale(yAxisDef!.order.length === 1 ? 0.5 : yIndex / (yAxisDef!.order.length - 1));
          const occupied = cell.count > 0;
          const fill = occupied ? GAP_COLOR.occupiedHigh : cell.plausibility === "impossible" ? GAP_COLOR.impossible : GAP_COLOR.unknown;
          const opacity = focusId
            ? occupied ? 0.05 : cell.plausibility === "impossible" ? 0.045 : 0.018
            : occupied
              ? 0.18 + 0.2 * (cell.count / Math.max(1, gapGrid.maxCount))
              : cell.plausibility === "impossible" ? 0.24 : 0.055;
          const xTag = cell.axisValues[xAxis];
          const yTag = cell.axisValues[yAxis];
          const description = occupied
            ? `점유 셀: ${xTag} × ${yTag} — ${cell.count}편 (${cell.paperIds.join(", ")})`
            : `빈 셀: ${xTag} × ${yTag} — ${cell.plausibility === "impossible" ? cell.reasons.join(" · ") : `미관측·판단 보류 (표본 ${nodes.length}편)`}`;
          return (
            <rect
              key={`gap-${cell.key}`}
              x={cx - cellStepX / 2}
              y={cy - cellStepY / 2}
              width={cellStepX}
              height={cellStepY}
              fill={fill}
              opacity={opacity}
            >
              <title>{description}</title>
            </rect>
          );
        })}

        {/* x ticks */}
        {xAxisDef?.order.map((tag, i, arr) => {
          const t = arr.length === 1 ? 0.5 : i / (arr.length - 1);
          const px = xScale(t);
          const isActiveTag = activeProjection?.axes[0].tags.includes(tag) ?? false;
          return (
            <g key={tag}>
              <line x1={px} x2={px} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke={X_AXIS_COLOR} opacity={0.13} />
              <text
                x={px}
                y={HEIGHT - MARGIN.bottom + 14}
                fontSize={11}
                textAnchor="end"
                transform={`rotate(-40 ${px} ${HEIGHT - MARGIN.bottom + 14})`}
                fill={activeProjection ? (isActiveTag ? "#242421" : "#b9b6ad") : X_AXIS_COLOR}
                fontWeight={isActiveTag ? 600 : 400}
              >
                {tag}
              </text>
            </g>
          );
        })}

        {/* y ticks */}
        {yAxisDef?.order.map((tag, i, arr) => {
          const t = arr.length === 1 ? 0.5 : i / (arr.length - 1);
          const py = yScale(t);
          const isActiveTag = activeProjection?.axes[1].tags.includes(tag) ?? false;
          return (
            <g key={tag}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={py} y2={py} stroke={Y_AXIS_COLOR} opacity={0.13} />
              <text
                x={MARGIN.left - 12}
                y={py + 3}
                fontSize={11}
                textAnchor="end"
                fill={activeProjection ? (isActiveTag ? "#242421" : "#b9b6ad") : Y_AXIS_COLOR}
                fontWeight={isActiveTag ? 600 : 400}
              >
                {tag}
              </text>
            </g>
          );
        })}

        {/* axis titles */}
        <text x={(MARGIN.left + WIDTH - MARGIN.right) / 2} y={HEIGHT - 10} fontSize={13} textAnchor="middle" fill="#3D3D3A">
          <tspan fill={X_AXIS_COLOR} fontWeight={500}>X축 →</tspan>
          <tspan dx={6}>{AXIS_LABELS[xAxis]}</tspan>
        </text>
        <text
          x={18}
          y={(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}
          fontSize={13}
          textAnchor="middle"
          fill="#3D3D3A"
          transform={`rotate(-90 18 ${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2})`}
        >
          <tspan fill={Y_AXIS_COLOR} fontWeight={500}>Y축 →</tspan>
          <tspan dx={6}>{AXIS_LABELS[yAxis]}</tspan>
        </text>

        {/* silence / off-hierarchy lane labels */}
        <text x={xScale(SILENCE_T)} y={MARGIN.top - 8} fontSize={10} textAnchor="middle" fill="#9c9a92">
          silence
        </text>
        <text x={xScale(OFF_HIERARCHY_T)} y={MARGIN.top - 8} fontSize={10} textAnchor="middle" fill="#9c9a92">
          off-hier.
        </text>

        {/* edges (drawn under nodes) */}
        <g>
          {suggested.map((e) => (
            <SuggestedLine key={`s-${e.source}-${e.target}`} e={e} posById={displayPosById} onSelect={onEdgeDetailChange} visibility={edgeOverlayOpacity(overlay, e.source, e.target, focusId)} />
          ))}
          {visibleConfirmed.map((e) => (
            <ConfirmedLine key={`c-${e.source}-${e.target}`} e={e} posById={displayPosById} onSelect={onEdgeDetailChange} visibility={edgeOverlayOpacity(overlay, e.source, e.target, focusId)} />
          ))}
        </g>

        {/* same-coordinate regions: preserve shared-cell meaning after collision spreading */}
        {coordinateLayout.groups.map((group) => (
          <g key={group.key} aria-label={`동일 X·Y 좌표: ${group.ids.length}편`} opacity={!focusId || group.ids.includes(focusId) ? 1 : 0.12}>
            <circle
              cx={group.center[0]}
              cy={group.center[1]}
              r={group.radius}
              fill={group.color}
              fillOpacity={0.1}
              stroke={group.color}
              strokeWidth={1.5}
              strokeDasharray="3,3"
            >
              <title>{`동일 X·Y 좌표 (${group.ids.length}편): ${group.ids.join(", ")}`}</title>
            </circle>
            <text
              x={group.center[0]}
              y={group.center[1] + 3}
              textAnchor="middle"
              fontSize={10}
              fontWeight={500}
              fill={group.color}
              stroke="#fbfaf6"
              strokeWidth={2.5}
              paintOrder="stroke"
            >
              ×{group.ids.length}
            </text>
          </g>
        ))}

        {/* nodes */}
        {projected.map((p) => (
          <PlotNode
            key={p.id}
            p={p}
            node={byId.get(p.id)!}
            position={displayPosById.get(p.id)!}
            labelPosition={labelPosById.get(p.id)!}
            coordinateGroup={coordinateLayout.groupById.get(p.id)}
            xScale={xScale}
            yScale={yScale}
            selected={p.id === selectedId}
            focused={p.id === focusId}
            inactive={focusId !== null && p.id !== focusId}
            overlay={overlay}
            onSelect={onSelect}
            onFocusToggle={onFocusToggle}
          />
        ))}
      </svg>
      </div>
      <Legend coordinateGroups={coordinateLayout.groups} hideDisjoint={hideDisjoint} onHideDisjointChange={onHideDisjointChange} />
      <EdgeRelationPanel detail={edgeDetail} onClear={() => onEdgeDetailChange(null)} />
      <p className="gap-caution">빈 셀은 현재 코퍼스에서 관측되지 않은 조합이며, 연구 기회로 확정되지 않습니다.</p>
    </div>
  );
}

function PlotNode({
  p,
  node,
  position,
  labelPosition,
  coordinateGroup,
  xScale,
  yScale,
  selected,
  focused,
  inactive,
  overlay,
  onSelect,
  onFocusToggle,
}: {
  p: ProjectedNode;
  node: Sidecar;
  position: [number, number];
  labelPosition: NodeLabelPlacement;
  coordinateGroup?: CoordinateGroup;
  xScale: (t: number) => number;
  yScale: (t: number) => number;
  selected: boolean;
  focused: boolean;
  inactive: boolean;
  overlay: SetOverlayResult;
  onSelect: (id: string) => void;
  onFocusToggle: (id: string) => void;
}) {
  const [px, py] = p.axes;
  const [cx, cy] = position;
  const color =
    px.lane === "silence" && px.silenceType
      ? SILENCE_COLOR[px.silenceType]
      : py.lane === "silence" && py.silenceType
        ? SILENCE_COLOR[py.silenceType]
        : MODE_COLOR[node.mode];
  const title = `${node.id}\nX: ${px.tags.join(", ")}\nY: ${py.tags.join(", ")}${coordinateGroup ? `\n동일 좌표 그룹: ${coordinateGroup.ids.length}편` : ""}`;
  const overlayState = overlay.nodes.get(node.id);
  const overlayActive = Boolean(overlay.selection.axis && (overlay.selection.axis === "14_lineage" || overlay.selection.member));

  return (
    <g
      onClick={(event) => {
        if (event.detail >= 2) onFocusToggle(node.id);
        else onSelect(node.id);
      }}
      role="button"
      tabIndex={inactive ? -1 : 0}
      aria-pressed={focused}
      aria-label={`${title}. 클릭하여 상세 보기, 두 번 클릭하여 강조 모드 전환`}
      onKeyDown={(event) => {
        if (inactive) return;
        if (event.key === "Enter") onFocusToggle(node.id);
        if (event.key === " ") {
          event.preventDefault();
          onSelect(node.id);
        }
      }}
      pointerEvents={inactive ? "none" : "auto"}
      style={{ cursor: inactive ? "default" : "pointer" }}
      opacity={inactive ? 0.16 : selected || focused ? 1 : nodeOverlayOpacity(overlay, node.id, null)}
    >
      <title>{`${title}${overlayActive ? `\n오버레이: ${overlayState?.matched ? "일치" : overlayState?.available ? "불일치" : "데이터 없음"}` : ""}`}</title>
      <AxisCoverageRail projection={px} anchor={[cx, cy]} axis="x" scale={xScale} color={X_AXIS_COLOR} />
      <AxisCoverageRail projection={py} anchor={[cx, cy]} axis="y" scale={yScale} color={Y_AXIS_COLOR} />
      {overlayActive && overlayState?.matched && (
        <circle
          cx={cx}
          cy={cy}
          r={12.5}
          fill="none"
          stroke="#16766b"
          strokeWidth={2}
          strokeDasharray={overlay.selection.axis === "14_lineage" ? "3,2" : undefined}
          pointerEvents="none"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={10}
        fill="none"
        stroke="#3D3D3A"
        strokeWidth={1.5}
        opacity={selected || focused ? 1 : 0}
        pointerEvents="none"
      />
      <circle
        cx={cx}
        cy={cy}
        r={selected || focused ? 7 : 6}
        fill={color}
        stroke={coordinateGroup?.color ?? "#fff"}
        strokeWidth={coordinateGroup ? 3 : 1.5}
      />
      {!inactive && (labelPosition.visible || selected || focused) && labelPosition.leader && (
        <line
          x1={cx}
          y1={cy}
          x2={labelPosition.x}
          y2={labelPosition.y - 3}
          stroke="#78766c"
          strokeWidth={0.8}
          opacity={0.55}
        />
      )}
      {!inactive && (labelPosition.visible || selected || focused) && (
        <text
          x={labelPosition.x}
          y={labelPosition.y}
          fontSize={10}
          textAnchor={labelPosition.anchor}
          fill="#3D3D3A"
          stroke="#fbfaf6"
          strokeWidth={3}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {node.id}
        </text>
      )}
    </g>
  );
}

function AxisCoverageRail({
  projection,
  anchor,
  axis,
  scale,
  color,
}: {
  projection: ProjectedNode["axes"][number];
  anchor: [number, number];
  axis: "x" | "y";
  scale: (t: number) => number;
  color: string;
}) {
  if (!projection.values || projection.values.length < 2) return null;
  const [cx, cy] = anchor;
  const visibleValues = projection.values.filter(
    (value) => projection.anchorKind === "centroid" || Math.abs(value.t - projection.t) > 1e-6
  );

  return (
    <g aria-label={`${axis.toUpperCase()}축 복수 영역: ${projection.values.map((value) => value.tag).join(", ")}`}>
      {visibleValues.map((value) => {
        const vx = axis === "x" ? scale(value.t) : cx;
        const vy = axis === "y" ? scale(value.t) : cy;
        return (
          <g key={`${axis}-${value.tag}`}>
            <line
              x1={cx}
              y1={cy}
              x2={vx}
              y2={vy}
              stroke={color}
              strokeWidth={1.4}
              strokeDasharray="3,3"
              opacity={0.65}
            />
            <circle cx={vx} cy={vy} r={3.5} fill="#fbfaf6" stroke={color} strokeWidth={1.5}>
              <title>{`${axis.toUpperCase()}축 추가 영역: ${value.tag}${projection.anchorKind === "centroid" ? " · 대표 노드는 태그들의 중심값" : ""}`}</title>
            </circle>
          </g>
        );
      })}
    </g>
  );
}

function layoutCoincidentNodes(
  projected: ProjectedNode[],
  xScale: (t: number) => number,
  yScale: (t: number) => number
): { positions: Map<string, [number, number]>; groups: CoordinateGroup[]; groupById: Map<string, CoordinateGroup> } {
  const groups = new Map<string, ProjectedNode[]>();
  for (const p of projected) {
    const key = `${p.axes[0].t.toFixed(5)}:${p.axes[1].t.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  const positions = new Map<string, [number, number]>();
  const coordinateGroups: CoordinateGroup[] = [];
  const groupById = new Map<string, CoordinateGroup>();
  const coincidentEntries = [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));
  const colorByKey = new Map(coincidentEntries.map(([key], index) => [key, COORDINATE_GROUP_COLORS[index % COORDINATE_GROUP_COLORS.length]]));

  for (const [key, group] of groups.entries()) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const baseX = xScale(sorted[0].axes[0].t);
    const baseY = yScale(sorted[0].axes[1].t);
    const radius = COLLISION_RADIUS + Math.max(0, sorted.length - 6) * 1.5;
    if (sorted.length > 1) {
      const coordinateGroup: CoordinateGroup = {
        key,
        color: colorByKey.get(key)!,
        center: [baseX, baseY],
        radius: radius + 9,
        ids: sorted.map((p) => p.id),
      };
      coordinateGroups.push(coordinateGroup);
      sorted.forEach((p) => groupById.set(p.id, coordinateGroup));
    }
    sorted.forEach((p, index) => {
      if (sorted.length === 1) {
        positions.set(p.id, [baseX, baseY]);
        return;
      }
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / sorted.length;
      positions.set(p.id, [
        Math.max(MARGIN.left + 8, Math.min(WIDTH - MARGIN.right - 8, baseX + Math.cos(angle) * radius)),
        Math.max(MARGIN.top + 8, Math.min(HEIGHT - MARGIN.bottom - 8, baseY + Math.sin(angle) * radius)),
      ]);
    });
  }
  return { positions, groups: coordinateGroups, groupById };
}

function layoutNodeLabels(
  nodes: Sidecar[],
  positions: Map<string, [number, number]>,
  priorityId: string | null
): Map<string, NodeLabelPlacement> {
  type Box = { left: number; right: number; top: number; bottom: number };
  const placed: Box[] = [];
  const result = new Map<string, NodeLabelPlacement>();
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const ordered = [...positions.entries()].sort((a, b) => {
    if (a[0] === priorityId) return -1;
    if (b[0] === priorityId) return 1;
    return a[1][1] - b[1][1] || a[1][0] - b[1][0];
  });
  const plot = {
    left: MARGIN.left + 3,
    right: WIDTH - MARGIN.right - 3,
    top: MARGIN.top + 3,
    bottom: HEIGHT - MARGIN.bottom - 3,
  };

  const overlapArea = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  for (const [id, [cx, cy]] of ordered) {
    const label = nodeById.get(id)?.id ?? id;
    const width = Math.min(218, Math.max(52, label.length * 5.7));
    const preferLeft = cx > (plot.left + plot.right) / 2;
    const sides: Array<"start" | "end"> = preferLeft ? ["end", "start"] : ["start", "end"];
    const verticalOffsets = [3, -13, 19, -29, 35, -45, 51, -61, 67, -77, 83];
    const candidates: Array<{ placement: NodeLabelPlacement; box: Box; score: number; outside: number; collision: number }> = [];

    for (const anchor of sides) {
      for (const dy of verticalOffsets) {
        const x = cx + (anchor === "start" ? 10 : -10);
        const y = cy + dy;
        const box: Box = {
          left: anchor === "start" ? x : x - width,
          right: anchor === "start" ? x + width : x,
          top: y - 11,
          bottom: y + 5,
        };
        const outside =
          Math.max(0, plot.left - box.left) +
          Math.max(0, box.right - plot.right) +
          Math.max(0, plot.top - box.top) +
          Math.max(0, box.bottom - plot.bottom);
        const collision = placed.reduce((sum, other) => sum + overlapArea(box, other), 0);
        const travel = Math.abs(dy - 3) * 0.12 + (anchor === sides[0] ? 0 : 4);
        candidates.push({
          placement: { x, y, anchor, leader: Math.abs(dy - 3) > 8, visible: true },
          box,
          score: outside * 1000 + collision * 20 + travel,
          outside,
          collision,
        });
      }
    }

    const best = candidates.sort((a, b) => a.score - b.score)[0];
    const visible = best.outside === 0 && best.collision === 0;
    if (visible) placed.push(best.box);
    result.set(id, { ...best.placement, visible });
  }
  return result;
}

function SuggestedLine({
  e,
  posById,
  onSelect,
  visibility,
}: {
  e: SuggestedEdge;
  posById: Map<string, [number, number]>;
  onSelect: (detail: EdgeRelationDetail | null) => void;
  visibility: number;
}) {
  const a = posById.get(e.source);
  const b = posById.get(e.target);
  if (!a || !b) return null;
  const detail = suggestedEdgeDetail(e);
  return (
    <g opacity={visibility} pointerEvents={visibility >= 0.3 ? "auto" : "none"}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={SUGGESTED_EDGE_STYLE.color} strokeWidth={SUGGESTED_STROKE_WIDTH} strokeDasharray="3,4" opacity={SUGGESTED_OPACITY} />
      <line
        className="edge-hit-area"
        tabIndex={0}
        aria-label={`${detail.title} · ${detail.relation}. 두 번 클릭하여 설명 보기`}
        x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
        onDoubleClick={() => onSelect(detail)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(detail); }}
      />
    </g>
  );
}

function ConfirmedLine({
  e,
  posById,
  onSelect,
  visibility,
}: {
  e: ConfirmedEdge;
  posById: Map<string, [number, number]>;
  onSelect: (detail: EdgeRelationDetail | null) => void;
  visibility: number;
}) {
  const a = posById.get(e.source);
  const b = posById.get(e.target);
  if (!a || !b) return null;
  const style = RELATION_STYLE[e.type as RelationType];
  const width = e.distant ? CONFIRMED_STROKE_WIDTH.distant : CONFIRMED_STROKE_WIDTH.close;
  const opacity = e.reciprocal ? CONFIRMED_OPACITY : ASYMMETRIC_OPACITY;
  // direction='to_target' -> arrow points source->target; 'from_target' -> target->source (schema: lineage = ancestor(target)->paper(source)).
  const markerId = style.arrow ? (e.type === "lineage" ? "arrow-lineage" : "arrow-premise") : undefined;
  const [x1, y1, x2, y2] = e.direction === "from_target" ? [b[0], b[1], a[0], a[1]] : [a[0], a[1], b[0], b[1]];
  const detail = confirmedEdgeDetail(e);
  return (
    <g opacity={visibility} pointerEvents={visibility >= 0.3 ? "auto" : "none"}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={style.color} strokeWidth={width} strokeDasharray={style.dashed ? "6,4" : undefined} opacity={opacity} markerEnd={markerId ? `url(#${markerId})` : undefined} />
      <line
        className="edge-hit-area"
        tabIndex={0}
        aria-label={`${detail.title} · ${detail.relation}. 두 번 클릭하여 설명 보기`}
        x1={x1} y1={y1} x2={x2} y2={y2}
        onDoubleClick={() => onSelect(detail)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(detail); }}
      />
    </g>
  );
}

function Legend({
  coordinateGroups,
  hideDisjoint,
  onHideDisjointChange,
}: {
  coordinateGroups: CoordinateGroup[];
  hideDisjoint: boolean;
  onHideDisjointChange: (value: boolean) => void;
}) {
  return (
    <details className="disclosure legend-details">
      <summary>범례</summary>
      <div className="legend disclosure-body">
        <div className="legend-group">
          <h4>노드</h4>
          <div className="legend-items">
            <div>
              <span className="swatch" style={{ background: MODE_COLOR.standard }} /> standard
            </div>
            <div>
              <span className="swatch" style={{ background: MODE_COLOR.precursor }} /> precursor
            </div>
            {(Object.entries(SILENCE_COLOR) as [Silence, string][]).map(([k, v]) => (
              <div key={k}>
                <span className="swatch" style={{ background: v }} /> silence: {k}
              </div>
            ))}
          </div>
        </div>
        {coordinateGroups.length > 0 && (
          <div className="legend-group">
            <h4>동일 좌표 영역</h4>
            <div className="legend-items">
              {coordinateGroups.map((group, index) => (
                <div key={group.key} title={group.ids.join(", ")}>
                  <span className="group-swatch" style={{ borderColor: group.color, background: `${group.color}1a` }} />
                  그룹 {index + 1} · ×{group.ids.length}편
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="legend-group">
          <h4>복수 영역</h4>
          <div className="legend-items">
            <div><span className="coverage-rail-swatch" style={{ color: X_AXIS_COLOR }} /> X축 추가 태그</div>
            <div><span className="coverage-rail-swatch" style={{ color: Y_AXIS_COLOR }} /> Y축 추가 태그</div>
            <div><span className="swatch coverage-anchor-swatch" /> 대표 위치</div>
          </div>
        </div>
        <div className="legend-group">
          <h4>엣지</h4>
          <div className="legend-items">
            {(Object.entries(RELATION_STYLE) as [RelationType, typeof RELATION_STYLE[RelationType]][]).map(([k, s]) => (
              <div key={k}>
              <span className="line-swatch" style={{ background: s.color, opacity: s.dashed ? 0.5 : 1 }} /> {RELATION_LABEL[k]}
              </div>
            ))}
            <div>
              <span className="line-swatch" style={{ background: SUGGESTED_EDGE_STYLE.color, opacity: 0.5 }} /> 유사도 기반 제안
            </div>
          </div>
          <label className="legend-toggle">
            <input
              type="checkbox"
              checked={hideDisjoint}
              onChange={(event) => onHideDisjointChange(event.target.checked)}
            />
            직접 비교 어려운 엣지 숨기기
          </label>
        </div>
        <div className="legend-group">
          <h4>격자 셀</h4>
          <div className="legend-items">
            <div>
              <span className="swatch" style={{ background: GAP_COLOR.occupiedHigh, opacity: 0.55 }} /> 점유
            </div>
            <div>
              <span className="swatch" style={{ background: GAP_COLOR.impossible, opacity: 0.5 }} /> 불가능
            </div>
            <div>
              <span className="swatch" style={{ background: GAP_COLOR.unknown, opacity: 0.3 }} /> 미관측·판단 보류
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

// 3D projection (dev-plan §4.6): three axes rendered as a rotatable Three.js
// scene via react-three-fiber. Reuses the same ProjectionEngine output as
// the 1D/2D renderers — only the scene, not the math, is dimension-specific.
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { scaleLinear } from "d3-scale";
import type { Sidecar } from "../types/sidecar";
import { getAxisSlots } from "../lib/axisRegistry";
import { AXIS_LABELS } from "../data/axisLabels";
import { projectNodes, type AxisProjection, type ProjectedNode } from "../lib/projectionEngine";
import { SILENCE_COLOR, MODE_COLOR, AXIS_COLOR } from "../lib/colors";
import { computeEdges, type ConfirmedEdge, type SuggestedEdge } from "../lib/edgeEngine";
import {
  RELATION_STYLE,
  SUGGESTED_EDGE_STYLE,
  CONFIRMED_STROKE_WIDTH,
  SUGGESTED_STROKE_WIDTH,
  CONFIRMED_OPACITY,
  SUGGESTED_OPACITY,
  ASYMMETRIC_OPACITY,
} from "../lib/edgeStyle";
import { computeGrid, type GridCell } from "../lib/gapEngine";
import GapVolume3D from "./GapVolume3D";
import {
  edgeOverlayOpacity,
  nodeOverlayOpacity,
  type SetOverlayResult,
} from "../lib/setAxisEngine";
import { confirmedEdgeDetail, suggestedEdgeDetail, type EdgeRelationDetail } from "../lib/edgeDetail";
import EdgeRelationPanel from "./EdgeRelationPanel";

const SCENE_HALF = 4;
const DOMAIN_MIN = -0.26;
const DOMAIN_MAX = 1.06;
const NANUM_SQUARE_NEO_FONT = "https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeo-Variable.woff";

const toScene = scaleLinear().domain([DOMAIN_MIN, DOMAIN_MAX]).range([-SCENE_HALF, SCENE_HALF]);

interface Props {
  nodes: Sidecar[];
  axes: [string, string, string];
  selectedId: string | null;
  focusId: string | null;
  overlay: SetOverlayResult;
  onSelect: (id: string) => void;
  onFocusToggle: (id: string) => void;
  hideDisjoint: boolean;
  edgeDetail: EdgeRelationDetail | null;
  onEdgeDetailChange: (detail: EdgeRelationDetail | null) => void;
}

function scenePos(p: ProjectedNode): [number, number, number] {
  const [ax, ay, az] = p.axes;
  return [toScene(ax.t), toScene(ay.t), toScene(az.t)];
}

export default function ThreeScatter({ nodes, axes, selectedId, focusId, overlay, onSelect, onFocusToggle, hideDisjoint, edgeDetail, onEdgeDetailChange }: Props) {
  const [gapCell, setGapCell] = useState<GridCell | null>(null);
  const [sliceIndex, setSliceIndex] = useState(0);
  const projected = projectNodes(nodes, axes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const posById = new Map(projected.map((p) => [p.id, p]));
  const { confirmed, suggested } = computeEdges(nodes);
  const visibleConfirmed = hideDisjoint ? confirmed.filter((e) => e.type !== "disjoint") : confirmed;
  const gapGrid = useMemo(() => computeGrid(nodes, axes), [nodes, axes]);
  const useSlice = gapGrid.cells.length > 8000;
  const displayedGapCells = useSlice
    ? gapGrid.cells.filter((cell) => cell.indices[2] === sliceIndex)
    : gapGrid.cells;

  useEffect(() => {
    setSliceIndex(0);
    setGapCell(null);
  }, [axes]);

  const gapCellSummary = gapCell
    ? gapCell.count > 0
      ? `${axes.map((axis) => gapCell.axisValues[axis]).join(" × ")} · ${gapCell.count}편: ${gapCell.paperIds.join(", ")}`
      : `${axes.map((axis) => gapCell.axisValues[axis]).join(" × ")} · ${gapCell.plausibility === "impossible" ? gapCell.reasons.join(" · ") : `미관측·판단 보류 (표본 ${nodes.length}편)`}`
    : `격자 ${gapGrid.cells.length}셀 · 점유 ${gapGrid.occupiedCount} · 빈 셀 ${gapGrid.emptyCount}`;

  return (
    <div className="scatter-wrap">
      <div
        className="three-stage"
        role="img"
        aria-label={`PIM 논문 3축 산점도. ${gapCellSummary}`}
      >
        {useSlice && (
          <label className="three-slice-control">
            Z 단면
            <select value={sliceIndex} onChange={(event) => setSliceIndex(Number(event.target.value))}>
              {getAxisSlots(axes[2])?.order.map((tag, index) => <option key={tag} value={index}>{tag}</option>)}
            </select>
            <span>{displayedGapCells.length}/{gapGrid.cells.length}셀</span>
          </label>
        )}
        <Canvas camera={{ position: [7, 6, 7], fov: 45 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 5]} intensity={0.6} />
          <OrbitControls enableDamping dampingFactor={0.1} />

          {axes.map((axisKey, dim) => (
            <AxisGuide key={axisKey} axisKey={axisKey} dim={dim as 0 | 1 | 2} />
          ))}

          <GapVolume3D
            grid={gapGrid}
            cells={displayedGapCells}
            focusActive={focusId !== null}
            onHover={setGapCell}
          />

          {suggested.map((e) => (
            <SuggestedEdgeLine key={`s-${e.source}-${e.target}`} e={e} posById={posById} visibility={edgeOverlayOpacity(overlay, e.source, e.target, focusId)} onSelect={onEdgeDetailChange} />
          ))}
          {visibleConfirmed.map((e) => (
            <ConfirmedEdgeLine key={`c-${e.source}-${e.target}`} e={e} posById={posById} visibility={edgeOverlayOpacity(overlay, e.source, e.target, focusId)} onSelect={onEdgeDetailChange} />
          ))}

          {projected.map((p) => {
            const node = byId.get(p.id)!;
            const [ax, ay, az] = p.axes;
            const pos: [number, number, number] = [toScene(ax.t), toScene(ay.t), toScene(az.t)];
            const silentAxis = [ax, ay, az].find((a) => a.lane === "silence" && a.silenceType);
            const color = silentAxis ? SILENCE_COLOR[silentAxis.silenceType!] : MODE_COLOR[node.mode];
            const selected = p.id === selectedId;
            const focused = p.id === focusId;
            const inactive = focusId !== null && !focused;
            const overlayState = overlay.nodes.get(p.id);
            const overlayActive = Boolean(overlay.selection.axis && (overlay.selection.axis === "14_lineage" || overlay.selection.member));
            const opacity = selected || focused ? 1 : nodeOverlayOpacity(overlay, p.id, focusId);
            return (
              <group key={p.id} position={pos}>
                {[ax, ay, az].map((projection, dim) => (
                  <AxisCoverage3D key={dim} projection={projection} dim={dim as 0 | 1 | 2} active={!inactive} />
                ))}
                {overlayActive && overlayState?.matched && (
                  <mesh>
                    <torusGeometry args={[0.2, 0.025, 10, 28]} />
                    <meshBasicMaterial color="#16766b" transparent opacity={0.95} />
                  </mesh>
                )}
                <mesh
                  onClick={inactive ? undefined : (event) => { event.stopPropagation(); onSelect(p.id); }}
                  onDoubleClick={inactive ? undefined : (event) => { event.stopPropagation(); onFocusToggle(p.id); }}
                >
                  <sphereGeometry args={[selected || focused ? 0.16 : 0.11, 16, 16]} />
                  <meshStandardMaterial
                    color={color}
                    emissive={selected || focused ? color : "#000000"}
                    emissiveIntensity={selected || focused ? 0.4 : 0}
                    transparent={opacity < 1}
                    opacity={opacity}
                  />
                </mesh>
                {!inactive && (!overlayActive || overlayState?.matched || selected) && (
                  <Text font={NANUM_SQUARE_NEO_FONT} position={[0, 0.22, 0]} fontSize={0.15} color="#3D3D3A" anchorX="center" anchorY="bottom">
                    {node.id}
                  </Text>
                )}
              </group>
            );
          })}
        </Canvas>
        <div className="three-gap-tooltip" role="status">{gapCellSummary}</div>
      </div>
      <div className="gap-inline-legend" aria-label="3D 격자 셀 범례">
        <span><i className="gap-key occupied" />점유</span>
        <span><i className="gap-key impossible" />불가능</span>
        <span><i className="gap-key unknown" />미관측·판단 보류</span>
      </div>
      <EdgeRelationPanel detail={edgeDetail} onClear={() => onEdgeDetailChange(null)} />
      <p className="three-hint">채운 구는 대표 위치, 축 색상의 빈 구는 추가 태그입니다. 드래그로 회전하고 셀에 마우스를 올려 조합을 확인하세요.</p>
      <p className="gap-caution">빈 셀은 현재 코퍼스에서 관측되지 않은 조합이며, 연구 기회로 확정되지 않습니다.</p>
    </div>
  );
}

function AxisCoverage3D({ projection, dim, active }: { projection: AxisProjection; dim: 0 | 1 | 2; active: boolean }) {
  if (!projection.values || projection.values.length < 2) return null;
  const visibleValues = projection.values.filter(
    (value) => projection.anchorKind === "centroid" || Math.abs(value.t - projection.t) > 1e-6
  );
  return (
    <group>
      {visibleValues.map((value) => {
        const endpoint: [number, number, number] = [0, 0, 0];
        endpoint[dim] = toScene(value.t) - toScene(projection.t);
        return (
          <group key={value.tag}>
            <Line
              points={[[0, 0, 0], endpoint]}
              color={AXIS_COLOR[dim]}
              lineWidth={1}
              dashed
              dashSize={0.06}
              gapSize={0.05}
              transparent
              opacity={active ? 0.7 : 0.08}
            />
            <mesh position={endpoint}>
              <sphereGeometry args={[0.075, 12, 12]} />
              <meshBasicMaterial color={AXIS_COLOR[dim]} wireframe transparent opacity={active ? 1 : 0.08} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// No arrowheads in 3D (drei Line has no built-in arrow marker; a cone mesh
// per directed edge would be needed) — color/dash/opacity still carry the
// same relation-type meaning as the 2D legend. Direction is only conveyed
// via the 2D view for now.
function SuggestedEdgeLine({ e, posById, visibility, onSelect }: { e: SuggestedEdge; posById: Map<string, ProjectedNode>; visibility: number; onSelect: (detail: EdgeRelationDetail | null) => void }) {
  const a = posById.get(e.source);
  const b = posById.get(e.target);
  if (!a || !b) return null;
  const points = [scenePos(a), scenePos(b)] as [[number, number, number], [number, number, number]];
  return (
    <group>
      <Line points={points} color={SUGGESTED_EDGE_STYLE.color} lineWidth={SUGGESTED_STROKE_WIDTH} dashed dashSize={0.08} gapSize={0.08} transparent opacity={SUGGESTED_OPACITY * visibility} />
      {visibility >= 0.3 && <Line points={points} color={SUGGESTED_EDGE_STYLE.color} lineWidth={10} transparent opacity={0.001} onDoubleClick={(event) => { event.stopPropagation(); onSelect(suggestedEdgeDetail(e)); }} />}
    </group>
  );
}

function ConfirmedEdgeLine({ e, posById, visibility, onSelect }: { e: ConfirmedEdge; posById: Map<string, ProjectedNode>; visibility: number; onSelect: (detail: EdgeRelationDetail | null) => void }) {
  const a = posById.get(e.source);
  const b = posById.get(e.target);
  if (!a || !b) return null;
  const style = RELATION_STYLE[e.type];
  const points = [scenePos(a), scenePos(b)] as [[number, number, number], [number, number, number]];
  return (
    <group>
      <Line points={points} color={style.color} lineWidth={e.distant ? CONFIRMED_STROKE_WIDTH.distant : CONFIRMED_STROKE_WIDTH.close} dashed={style.dashed} dashSize={0.1} gapSize={0.06} transparent opacity={(e.reciprocal ? CONFIRMED_OPACITY : ASYMMETRIC_OPACITY) * visibility} />
      {visibility >= 0.3 && <Line points={points} color={style.color} lineWidth={10} transparent opacity={0.001} onDoubleClick={(event) => { event.stopPropagation(); onSelect(confirmedEdgeDetail(e)); }} />}
    </group>
  );
}

function AxisGuide({ axisKey, dim }: { axisKey: string; dim: 0 | 1 | 2 }) {
  const axisDef = getAxisSlots(axisKey);
  const start: [number, number, number] = [0, 0, 0];
  const end: [number, number, number] = [0, 0, 0];
  start[dim] = toScene(DOMAIN_MIN);
  end[dim] = toScene(DOMAIN_MAX);

  const points: [number, number, number][] = axisDef
    ? axisDef.order.map((_, i, arr) => {
        const t = arr.length === 1 ? 0.5 : i / (arr.length - 1);
        const p: [number, number, number] = [0, 0, 0];
        p[dim] = toScene(t);
        return p;
      })
    : [];

  const labelOffset: [number, number, number] = [0, 0, 0];
  labelOffset[(dim + 1) % 3] = -0.3;

  return (
    <group>
      <Line points={[start, end]} color="#c9c6b8" lineWidth={1} />
      {axisDef?.order.map((tag, i) => {
        const p = points[i];
        const labelPos: [number, number, number] = [p[0] + labelOffset[0], p[1] + labelOffset[1], p[2] + labelOffset[2]];
        return (
          <Text font={NANUM_SQUARE_NEO_FONT} key={tag} position={labelPos} fontSize={0.12} color="#78766c" anchorX="center" anchorY="middle">
            {tag}
          </Text>
        );
      })}
      <Text
        font={NANUM_SQUARE_NEO_FONT}
        position={end.map((v, i) => (i === dim ? v + 0.35 : v)) as [number, number, number]}
        fontSize={0.18}
        color="#3D3D3A"
        anchorX="center"
        anchorY="middle"
      >
        {AXIS_LABELS[axisKey]}
      </Text>
    </group>
  );
}

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { loadGraph } from "./lib/dataLayer";
import AxisSelector from "./components/AxisSelector";
import OneDStrip from "./components/OneDStrip";
import ScatterCanvas from "./components/ScatterCanvas";
import ThreeScatter from "./components/ThreeScatter";
import PaperInspector from "./components/PaperInspector";
import ValidationPanel from "./components/ValidationPanel";
import CoveragePanel from "./components/CoveragePanel";
import PaperVisibilityToggle from "./components/PaperVisibilityToggle";
import SetOverlaySelector from "./components/SetOverlaySelector";
import { hasAxisValue } from "./lib/axisRegistry";
import { computeSetOverlay, type SetOverlaySelection } from "./lib/setAxisEngine";
import type { EdgeRelationDetail } from "./lib/edgeDetail";
import "./App.css";

const DEFAULT_AXES = ["1_location", "3_programmability"];
const DEFAULT_PANEL_WIDTHS = { left: 260, right: 340 };
const PANEL_LIMITS = { leftMin: 220, leftMax: 440, rightMin: 260, rightMax: 520, canvasMin: 420 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function App() {
  const { nodes, warningsById } = useMemo(() => loadGraph(), []);
  const [selectedAxes, setSelectedAxes] = useState<string[]>(DEFAULT_AXES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [setOverlay, setSetOverlay] = useState<SetOverlaySelection>({ axis: null, member: null });
  const [hideDisjoint, setHideDisjoint] = useState(true);
  const [edgeDetail, setEdgeDetail] = useState<EdgeRelationDetail | null>(null);
  const [panelWidths, setPanelWidths] = useState(DEFAULT_PANEL_WIDTHS);
  const layoutRef = useRef<HTMLDivElement>(null);

  const axisHiddenIds = new Set(
    nodes
      .filter((node) => !selectedAxes.every((axisKey) => hasAxisValue(node, axisKey)))
      .map((node) => node.id)
  );
  const visibleNodes = nodes.filter((node) => !hiddenIds.has(node.id) && !axisHiddenIds.has(node.id));
  const overlayResult = computeSetOverlay(visibleNodes, setOverlay);
  const visibleWarningsById = Object.fromEntries(
    Object.entries(warningsById).filter(([id]) => !hiddenIds.has(id))
  );
  const selectedNode = visibleNodes.find((n) => n.id === selectedId) ?? null;
  const dimLabel = ["", "1D", "2D", "3D"][selectedAxes.length] ?? "";
  const hasWarnings = Object.values(visibleWarningsById).some((w) => w.length > 0);

  function togglePaperVisibility(id: string) {
    const willHide = !hiddenIds.has(id);
    setHiddenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (willHide && selectedId === id) setSelectedId(null);
    if (willHide && focusId === id) setFocusId(null);
  }

  function toggleFocus(id: string) {
    setSelectedId(id);
    setFocusId((current) => current === id ? null : id);
  }

  function selectEdgeDetail(detail: EdgeRelationDetail | null) {
    setEdgeDetail((current) => detail && current?.key === detail.key ? null : detail);
  }

  function changeAxes(nextAxes: string[]) {
    setSelectedAxes(nextAxes);
    setEdgeDetail(null);
    if (selectedId) {
      const selected = nodes.find((node) => node.id === selectedId);
      if (!selected || !nextAxes.every((axisKey) => hasAxisValue(selected, axisKey))) {
        setSelectedId(null);
      }
    }
    if (focusId) {
      const focused = nodes.find((node) => node.id === focusId);
      if (!focused || !nextAxes.every((axisKey) => hasAxisValue(focused, axisKey))) {
        setFocusId(null);
      }
    }
  }

  function calculatePanelWidths(current: typeof panelWidths, side: "left" | "right", delta: number) {
    const layoutWidth = layoutRef.current?.clientWidth ?? 1200;
    if (window.innerWidth <= 1180) {
      const twoColumnMax = Math.min(
        PANEL_LIMITS.leftMax,
        layoutWidth - 48 - 16 - PANEL_LIMITS.canvasMin
      );
      return side === "left"
        ? { ...current, left: clamp(current.left + delta, PANEL_LIMITS.leftMin, Math.max(PANEL_LIMITS.leftMin, twoColumnMax)) }
        : current;
    }
    const fixedSpace = 48 + 32;
    const maxTogether = Math.max(
      PANEL_LIMITS.leftMin + PANEL_LIMITS.rightMin,
      layoutWidth - fixedSpace - PANEL_LIMITS.canvasMin
    );
    if (side === "left") {
      const maxLeft = Math.min(PANEL_LIMITS.leftMax, maxTogether - current.right);
      return { ...current, left: clamp(current.left + delta, PANEL_LIMITS.leftMin, maxLeft) };
    }
    const maxRight = Math.min(PANEL_LIMITS.rightMax, maxTogether - current.left);
    return { ...current, right: clamp(current.right - delta, PANEL_LIMITS.rightMin, maxRight) };
  }

  function resizePanel(side: "left" | "right", delta: number) {
    setPanelWidths((current) => calculatePanelWidths(current, side, delta));
  }

  function startResize(side: "left" | "right", event: PointerEvent<HTMLDivElement>) {
    if (window.innerWidth <= 720 || (window.innerWidth <= 1180 && side === "right")) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = panelWidths;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-panels");

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setPanelWidths(calculatePanelWidths(startWidths, side, delta));
    };
    const onEnd = () => {
      document.body.classList.remove("is-resizing-panels");
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
  }

  function resizeWithKeyboard(side: "left" | "right", event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    resizePanel(side, event.key === "ArrowRight" ? 16 : -16);
  }

  const layoutStyle = {
    "--left-panel-width": `${panelWidths.left}px`,
    "--right-panel-width": `${panelWidths.right}px`,
  } as CSSProperties;

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>PIM Flow Graph</h1>
        <span className="topbar-meta">
          논문 {visibleNodes.length}/{nodes.length}편 표시 · M4 투영+엣지+Gap ({dimLabel})
        </span>
      </header>
      <div className="layout" ref={layoutRef} style={layoutStyle}>
        <aside className="left-panel">
          <AxisSelector nodes={nodes} selectedAxes={selectedAxes} onChange={changeAxes} />
          <SetOverlaySelector nodes={visibleNodes} selection={setOverlay} onChange={setSetOverlay} />
          <PaperVisibilityToggle
            nodes={nodes}
            hiddenIds={hiddenIds}
            axisHiddenIds={axisHiddenIds}
            onToggle={togglePaperVisibility}
          />
          <details className="disclosure" open={hasWarnings}>
            <summary>검증</summary>
            <div className="disclosure-body">
              <ValidationPanel warningsById={visibleWarningsById} paperCount={visibleNodes.length} />
            </div>
          </details>
          <details className="disclosure">
            <summary>커버리지</summary>
            <div className="disclosure-body">
              <CoveragePanel nodes={visibleNodes} overlay={overlayResult} />
            </div>
          </details>
        </aside>
        <div
          className="panel-resizer panel-resizer-left"
          role="separator"
          aria-label="축 선택 영역 너비 조절"
          aria-orientation="vertical"
          aria-valuemin={PANEL_LIMITS.leftMin}
          aria-valuemax={PANEL_LIMITS.leftMax}
          aria-valuenow={panelWidths.left}
          tabIndex={0}
          onPointerDown={(event) => startResize("left", event)}
          onKeyDown={(event) => resizeWithKeyboard("left", event)}
          onDoubleClick={() => setPanelWidths((current) => ({ ...current, left: DEFAULT_PANEL_WIDTHS.left }))}
        />
        <main className="canvas-panel">
          {visibleNodes.length > 0 && selectedAxes.length > 0 && (
            <p className={`focus-mode-hint${focusId ? " is-active" : ""}`} aria-live="polite">
              {focusId
                ? `강조 모드: ${focusId} · 같은 노드를 다시 두 번 클릭하면 해제됩니다.`
                : "노드를 두 번 클릭하면 해당 논문과 직접 연결된 엣지를 강조합니다."}
            </p>
          )}
          {visibleNodes.length > 0 && setOverlay.axis && (
            <p className="set-overlay-hint" aria-live="polite">
              {setOverlay.axis === "14_lineage"
                ? `아이디어 계보: 확인된 연결 ${overlayResult.lineageEdgeCount}개 · 참여 논문 ${overlayResult.matchedCount}편${selectedAxes.length === 1 ? " · 계보 엣지는 2D/3D에서 확인" : ""}`
                : setOverlay.member
                  ? `${setOverlay.member}: ${overlayResult.matchedCount}/${visibleNodes.length}편 강조`
                  : "태그를 선택하면 해당 논문을 강조합니다."}
            </p>
          )}
          {visibleNodes.length === 0 && (
            <p className="canvas-empty">선택한 모든 축에 값을 가진 논문이 없습니다. 축 선택을 줄이거나 논문 표시 설정을 확인하세요.</p>
          )}
          {visibleNodes.length > 0 && selectedAxes.length === 0 && <p className="canvas-empty">축을 1~3개 선택하세요.</p>}
          {visibleNodes.length > 0 && selectedAxes.length === 1 && (
            <OneDStrip
              nodes={visibleNodes}
              axis={selectedAxes[0]}
              selectedId={selectedId}
              focusId={focusId}
              overlay={overlayResult}
              onSelect={setSelectedId}
              onFocusToggle={toggleFocus}
            />
          )}
          {visibleNodes.length > 0 && selectedAxes.length === 2 && (
            <ScatterCanvas
              nodes={visibleNodes}
              xAxis={selectedAxes[0]}
              yAxis={selectedAxes[1]}
              selectedId={selectedId}
              focusId={focusId}
              overlay={overlayResult}
              onSelect={setSelectedId}
              onFocusToggle={toggleFocus}
              hideDisjoint={hideDisjoint}
              onHideDisjointChange={setHideDisjoint}
              edgeDetail={edgeDetail}
              onEdgeDetailChange={selectEdgeDetail}
            />
          )}
          {visibleNodes.length > 0 && selectedAxes.length === 3 && (
            <ThreeScatter
              nodes={visibleNodes}
              axes={selectedAxes as [string, string, string]}
              selectedId={selectedId}
              focusId={focusId}
              overlay={overlayResult}
              onSelect={setSelectedId}
              onFocusToggle={toggleFocus}
              hideDisjoint={hideDisjoint}
              edgeDetail={edgeDetail}
              onEdgeDetailChange={selectEdgeDetail}
            />
          )}
        </main>
        <div
          className="panel-resizer panel-resizer-right"
          role="separator"
          aria-label="논문 설명 영역 너비 조절"
          aria-orientation="vertical"
          aria-valuemin={PANEL_LIMITS.rightMin}
          aria-valuemax={PANEL_LIMITS.rightMax}
          aria-valuenow={panelWidths.right}
          tabIndex={0}
          onPointerDown={(event) => startResize("right", event)}
          onKeyDown={(event) => resizeWithKeyboard("right", event)}
          onDoubleClick={() => setPanelWidths((current) => ({ ...current, right: DEFAULT_PANEL_WIDTHS.right }))}
        />
        <aside className="right-panel">
          <PaperInspector
            node={selectedNode}
            axes={selectedAxes}
            warnings={selectedId ? warningsById[selectedId] ?? [] : []}
            overlaySelection={setOverlay}
          />
        </aside>
      </div>
    </div>
  );
}

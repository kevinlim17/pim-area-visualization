import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D } from "three";
import type { GridCell, GridResult } from "../lib/gapEngine";
import { GAP_COLOR } from "../lib/colors";

const SCENE_HALF = 4;

interface Props {
  grid: GridResult;
  cells?: GridCell[];
  focusActive: boolean;
  onHover: (cell: GridCell | null) => void;
}

function coordinate(index: number, size: number): number {
  if (size <= 1) return 0;
  return -SCENE_HALF + (index / (size - 1)) * SCENE_HALF * 2;
}

function cellSize(size: number): number {
  const step = size <= 1 ? 1.4 : (SCENE_HALF * 2) / (size - 1);
  return Math.min(0.72, step * 0.72);
}

function CellInstances({
  cells,
  shape,
  maxCount,
  kind,
  focusActive,
  onHover,
}: {
  cells: GridCell[];
  shape: number[];
  maxCount: number;
  kind: "occupied" | "impossible" | "unknown";
  focusActive: boolean;
  onHover: (cell: GridCell | null) => void;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const size = shape.map(cellSize) as [number, number, number];

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const transform = new Object3D();
    const lowDensity = new Color(GAP_COLOR.occupiedLow);
    const highDensity = new Color(GAP_COLOR.occupiedHigh);
    cells.forEach((cell, index) => {
      transform.position.set(
        coordinate(cell.indices[0], shape[0]),
        coordinate(cell.indices[1], shape[1]),
        coordinate(cell.indices[2], shape[2])
      );
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      if (kind === "occupied") {
        const density = cell.count / Math.max(1, maxCount);
        mesh.setColorAt(index, lowDensity.clone().lerp(highDensity, density));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cells, kind, maxCount, shape]);

  if (cells.length === 0) return null;
  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.instanceId !== undefined) onHover(cells[event.instanceId] ?? null);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, cells.length]}
      onPointerMove={handleMove}
      onPointerOut={() => onHover(null)}
    >
      <boxGeometry args={size} />
      {kind === "occupied" ? (
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={focusActive ? 0.055 : 0.32}
          depthWrite={false}
        />
      ) : (
        <meshBasicMaterial
          color={kind === "impossible" ? GAP_COLOR.impossible : GAP_COLOR.unknown}
          wireframe
          transparent
          opacity={focusActive ? 0.025 : kind === "impossible" ? 0.32 : 0.035}
          depthWrite={false}
        />
      )}
    </instancedMesh>
  );
}

export default function GapVolume3D({ grid, cells, focusActive, onHover }: Props) {
  const groups = useMemo(() => {
    const source = cells ?? grid.cells;
    return {
      occupied: source.filter((cell) => cell.count > 0),
      impossible: source.filter((cell) => cell.count === 0 && cell.plausibility === "impossible"),
      unknown: source.filter((cell) => cell.count === 0 && cell.plausibility === "unknown"),
    };
  }, [cells, grid.cells]);

  if (grid.shape.length !== 3) return null;
  return (
    <group>
      <CellInstances cells={groups.unknown} shape={grid.shape} maxCount={grid.maxCount} kind="unknown" focusActive={focusActive} onHover={onHover} />
      <CellInstances cells={groups.impossible} shape={grid.shape} maxCount={grid.maxCount} kind="impossible" focusActive={focusActive} onHover={onHover} />
      <CellInstances cells={groups.occupied} shape={grid.shape} maxCount={grid.maxCount} kind="occupied" focusActive={focusActive} onHover={onHover} />
    </group>
  );
}

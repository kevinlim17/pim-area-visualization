import type { Sidecar, Silence } from "../types/sidecar";
import { getAxisSlots, scaleAxisTag } from "./axisRegistry";
import { evaluateGapConstraints } from "./gapConstraints";

export type CellPlausibility = "impossible" | "unknown";

export interface GridCell {
  key: string;
  indices: number[];
  axisValues: Record<string, string>;
  count: number;
  paperIds: string[];
  plausibility?: CellPlausibility;
  ruleIds: string[];
  reasons: string[];
}

export interface GridResult {
  dimensions: 1 | 2 | 3;
  axisKeys: string[];
  shape: number[];
  cells: GridCell[];
  occupiedCount: number;
  emptyCount: number;
  maxCount: number;
}

export interface EmptyCell {
  xIndex: number;
  xTag: string;
  yIndex: number;
  yTag: string;
  plausibility: CellPlausibility;
  reason?: string;
}

interface ResolvedAxisValue {
  index: number;
  tag: string;
}

function resolvedAxisValues(node: Sidecar, axisKey: string): ResolvedAxisValue[] {
  const block = node.axes[axisKey];
  const tags = block?.artifact ?? block?.tags ?? [];
  const result = new Map<number, ResolvedAxisValue>();
  for (const tag of tags) {
    if (tag.v === "Not addressed") continue;
    const position = scaleAxisTag(axisKey, tag.v);
    if (position?.kind !== "value") continue;
    const axis = getAxisSlots(axisKey);
    const index = axis?.order.indexOf(tag.v) ?? -1;
    if (index >= 0) result.set(index, { index, tag: tag.v });
  }
  return [...result.values()];
}

function cartesian<T>(groups: readonly T[][]): T[][] {
  return groups.reduce<T[][]>(
    (rows, group) => rows.flatMap((row) => group.map((value) => [...row, value])),
    [[]]
  );
}

export function resolveNodeCells(node: Sidecar, axisKeys: string[]): ResolvedAxisValue[][] {
  const perAxis = axisKeys.map((axisKey) => resolvedAxisValues(node, axisKey));
  if (perAxis.some((values) => values.length === 0)) return [];
  return cartesian(perAxis);
}

export function computeGrid(nodes: Sidecar[], axisKeys: string[]): GridResult {
  if (axisKeys.length < 1 || axisKeys.length > 3) {
    throw new Error(`Gap grid requires 1-3 axes, received ${axisKeys.length}`);
  }
  const definitions = axisKeys.map((axisKey) => getAxisSlots(axisKey));
  if (definitions.some((definition) => !definition)) {
    return {
      dimensions: axisKeys.length as 1 | 2 | 3,
      axisKeys,
      shape: [],
      cells: [],
      occupiedCount: 0,
      emptyCount: 0,
      maxCount: 0,
    };
  }

  const occupied = new Map<string, Set<string>>();
  for (const node of nodes) {
    for (const combination of resolveNodeCells(node, axisKeys)) {
      const key = combination.map((value) => value.index).join(":");
      const paperIds = occupied.get(key) ?? new Set<string>();
      paperIds.add(node.id);
      occupied.set(key, paperIds);
    }
  }

  const indexGroups = definitions.map((definition) => definition!.order.map((_, index) => index));
  const cells = cartesian(indexGroups).map<GridCell>((indices) => {
    const key = indices.join(":");
    const paperIds = [...(occupied.get(key) ?? [])].sort();
    const axisValues = Object.fromEntries(
      axisKeys.map((axisKey, dimension) => [axisKey, definitions[dimension]!.order[indices[dimension]]])
    );
    const violations = paperIds.length === 0
      ? evaluateGapConstraints(Object.fromEntries(Object.entries(axisValues).map(([axisKey, value]) => [axisKey, [value]])))
      : [];
    return {
      key,
      indices,
      axisValues,
      count: paperIds.length,
      paperIds,
      plausibility: paperIds.length > 0 ? undefined : violations.length > 0 ? "impossible" : "unknown",
      ruleIds: violations.map((violation) => violation.ruleId),
      reasons: violations.map((violation) => `${violation.ruleId}: ${violation.message}`),
    };
  });

  const occupiedCells = cells.filter((cell) => cell.count > 0);
  return {
    dimensions: axisKeys.length as 1 | 2 | 3,
    axisKeys,
    shape: definitions.map((definition) => definition!.order.length),
    cells,
    occupiedCount: occupiedCells.length,
    emptyCount: cells.length - occupiedCells.length,
    maxCount: Math.max(0, ...occupiedCells.map((cell) => cell.count)),
  };
}

export function computeEmptyCells(nodes: Sidecar[], xAxis: string, yAxis: string): EmptyCell[] {
  return computeGrid(nodes, [xAxis, yAxis]).cells
    .filter((cell) => cell.count === 0)
    .map((cell) => ({
      xIndex: cell.indices[0],
      xTag: cell.axisValues[xAxis],
      yIndex: cell.indices[1],
      yTag: cell.axisValues[yAxis],
      plausibility: cell.plausibility ?? "unknown",
      reason: cell.reasons.join(" · ") || undefined,
    }));
}

export function isSilentOn(node: Sidecar, axisKey: string): boolean {
  const block = node.axes[axisKey];
  if (!block) return true;
  if (axisKey === "14_lineage") {
    const lineage = block as typeof block & {
      inherited?: unknown[];
      coined?: unknown[];
      transmitted?: unknown[];
      abandoned?: unknown[];
    };
    return [lineage.inherited, lineage.coined, lineage.transmitted, lineage.abandoned]
      .every((items) => !Array.isArray(items) || items.length === 0);
  }
  if (!Array.isArray(block.tags) || block.tags.length === 0) return true;
  return block.tags.every((tag) => tag.v === "Not addressed");
}

export function silenceTypeOn(node: Sidecar, axisKey: string): Silence | undefined {
  return node.not_addressed.find((entry) => entry.axis === axisKey)?.silence;
}

// EdgeEngine: dev-plan §5 — candidate edges from Gower distance over all 26
// axes, confirmed edges from each sidecar's relations[], combined per §5.3.

import type { Direction, RelationType, Sidecar } from "../types/sidecar";
import { AXIS_LABELS } from "../data/axisLabels";
import { axisType, getAxisSlots, scaleAxisTag } from "./axisRegistry";

export const SUGGESTED_EDGE_THRESHOLD = 0.35;
export const DISTANT_RELATION_THRESHOLD = 0.5;

export interface ConfirmedEdge {
  source: string;
  target: string;
  type: RelationType;
  direction: Direction;
  reciprocal: boolean;
  distance: number | null;
  distant: boolean;
  /** Pair-specific reasoning from relations[].note, e.g. "Newton=FFN/FC, AttAcc=attention/decode·KV." */
  note?: string;
}

export interface SuggestedEdge {
  source: string;
  target: string;
  distance: number;
}

function tagValues(node: Sidecar, axisKey: string): string[] {
  const block = node.axes[axisKey];
  // 14_lineage has a structural shape (inherited/coined/transmitted/abandoned
  // arrays), not a tags[] array like every other axis — skip it here rather
  // than crash; it's excluded from Gower distance as a result (treated as
  // "missing" by axisDistance's length===0 check).
  if (!block || !Array.isArray(block.tags)) return [];
  return block.tags.filter((t) => t.v !== "Not addressed").map((t) => t.v);
}

function jaccardDistance(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const v of setA) if (setB.has(v)) intersection++;
  return 1 - intersection / union.size;
}

function centroidPosition(node: Sidecar, axisKey: string): number | null {
  const values = tagValues(node, axisKey);
  const positions = values
    .map((v) => scaleAxisTag(axisKey, v))
    .filter((p) => p?.kind === "value") as { kind: "value"; t: number }[];
  if (positions.length === 0) return null;
  return positions.reduce((sum, p) => sum + p.t, 0) / positions.length;
}

/** Per-axis Gower component distance in [0,1], or null if either paper is silent on this axis. */
function axisDistance(a: Sidecar, b: Sidecar, axisKey: string): number | null {
  const valuesA = tagValues(a, axisKey);
  const valuesB = tagValues(b, axisKey);
  if (valuesA.length === 0 || valuesB.length === 0) return null; // missing -> excluded from average

  const type = axisType(axisKey);
  if (type === "set") {
    return jaccardDistance(valuesA, valuesB);
  }
  if ((type === "ordinal" || type === "binary") && getAxisSlots(axisKey)) {
    const posA = centroidPosition(a, axisKey);
    const posB = centroidPosition(b, axisKey);
    if (posA !== null && posB !== null) return Math.abs(posA - posB);
    // fall through to nominal match/mismatch if positions unresolvable (e.g. off-hierarchy tags)
  }
  const intersects = valuesA.some((v) => valuesB.includes(v));
  return intersects ? 0 : 1;
}

/** Gower distance (equal-weighted average over axes both papers address). */
export function gowerDistance(a: Sidecar, b: Sidecar): number | null {
  const distances = Object.keys(AXIS_LABELS)
    .map((axisKey) => axisDistance(a, b, axisKey))
    .filter((d): d is number => d !== null);
  if (distances.length === 0) return null;
  return distances.reduce((sum, d) => sum + d, 0) / distances.length;
}

function hasReciprocal(target: Sidecar, sourceId: string): boolean {
  return target.relations.some((r) => r.target === sourceId);
}

export interface EdgeSet {
  confirmed: ConfirmedEdge[];
  suggested: SuggestedEdge[];
}

export function computeEdges(nodes: Sidecar[]): EdgeSet {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const confirmed: ConfirmedEdge[] = [];
  const confirmedPairKeys = new Set<string>();

  for (const node of nodes) {
    for (const rel of node.relations) {
      const target = byId.get(rel.target);
      if (!target) continue;
      const pairKey = [node.id, rel.target].sort().join("::");
      if (confirmedPairKeys.has(pairKey)) continue;
      confirmedPairKeys.add(pairKey);

      const distance = gowerDistance(node, target);
      confirmed.push({
        source: node.id,
        target: rel.target,
        type: rel.type,
        direction: rel.direction,
        reciprocal: hasReciprocal(target, node.id),
        distance,
        distant: distance !== null && distance > DISTANT_RELATION_THRESHOLD,
        note: rel.note,
      });
    }
  }

  const suggested: SuggestedEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const pairKey = [a.id, b.id].sort().join("::");
      if (confirmedPairKeys.has(pairKey)) continue; // confirmed already covers this pair
      const distance = gowerDistance(a, b);
      if (distance !== null && distance < SUGGESTED_EDGE_THRESHOLD) {
        suggested.push({ source: a.id, target: b.id, distance });
      }
    }
  }

  return { confirmed, suggested };
}

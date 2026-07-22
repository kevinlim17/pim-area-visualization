// ProjectionEngine: turns a node's tags on a chosen ordinal axis into a
// normalized coordinate, per dev-plan §4.4 —
//   - primary tag present -> its position
//   - no primary, multiple tags -> centroid, with min/max exposed as spread
//   - "Not addressed" -> silence lane, colored by the 4 silence types
//   - explored/artifact split (§4.1 DSE note) -> artifact drives position

import type { Sidecar, Silence, Tag } from "../types/sidecar";
import { scaleAxisTag } from "./axisRegistry";

export const SILENCE_T = -0.18;
export const OFF_HIERARCHY_T = -0.06;

export type Lane = "main" | "silence" | "offHierarchy";

export interface AxisProjection {
  t: number;
  lane: Lane;
  silenceType?: Silence;
  tags: string[];
  /** Exact resolvable tag positions. The main node stays at t; these points
   * render discrete coverage without implying every value between min/max. */
  values?: { t: number; tag: string; primary: boolean }[];
  anchorKind?: "single" | "primary" | "centroid";
  spread?: { tMin: number; tMax: number };
}

function silenceTypeFor(node: Sidecar, axisKey: string): Silence {
  return node.not_addressed.find((n) => n.axis === axisKey)?.silence ?? "OutOfScope";
}

export function projectAxis(node: Sidecar, axisKey: string): AxisProjection {
  const block = node.axes[axisKey];
  // DSE/meta papers (dev-plan §4.1): use the paper's own artifact coordinates,
  // not the design space it explores.
  const tags: Tag[] = block?.artifact ?? block?.tags ?? [];
  const nonSilent = tags.filter((t) => t.v !== "Not addressed");

  if (nonSilent.length === 0) {
    return {
      t: SILENCE_T,
      lane: "silence",
      silenceType: silenceTypeFor(node, axisKey),
      tags: ["Not addressed"],
    };
  }

  const scored = nonSilent.map((tag) => ({ tag, pos: scaleAxisTag(axisKey, tag.v) }));
  const valid = scored.filter((s) => s.pos?.kind === "value") as {
    tag: Tag;
    pos: { kind: "value"; t: number };
  }[];
  const offHierarchy = scored.filter((s) => s.pos?.kind === "offHierarchy");

  if (valid.length === 0) {
    if (offHierarchy.length > 0) {
      return {
        t: OFF_HIERARCHY_T,
        lane: "offHierarchy",
        tags: offHierarchy.map((o) => o.tag.v),
      };
    }
    // Tag(s) present but none resolvable on this axis's order (unknown/typo) — fall back to silence lane.
    return { t: SILENCE_T, lane: "silence", tags: nonSilent.map((t) => t.v) };
  }

  const primary = valid.find((v) => v.tag.primary);
  const ts = valid.map((v) => v.pos.t);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const t = primary ? primary.pos.t : ts.reduce((a, b) => a + b, 0) / ts.length;

  return {
    t,
    lane: "main",
    tags: nonSilent.map((n) => n.v),
    values: valid.map((v) => ({ t: v.pos.t, tag: v.tag.v, primary: v === primary || valid.length === 1 })),
    anchorKind: primary ? "primary" : valid.length === 1 ? "single" : "centroid",
    spread: valid.length > 1 ? { tMin, tMax } : undefined,
  };
}

export interface ProjectedNode {
  id: string;
  /** Parallel to the axisKeys passed to projectNodes — index 0/1/2 = X/Y/Z. */
  axes: AxisProjection[];
}

/** Projects nodes onto 1-3 axes (dev-plan §4.6 dimension fold: 1D/2D/3D). */
export function projectNodes(nodes: Sidecar[], axisKeys: string[]): ProjectedNode[] {
  return nodes.map((node) => ({
    id: node.id,
    axes: axisKeys.map((axisKey) => projectAxis(node, axisKey)),
  }));
}

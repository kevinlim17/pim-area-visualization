import { AXIS_VOCAB } from "../data/axisVocab";
import type {
  AbandonReason,
  AbandonedItem,
  LineageBlock,
  LineageForm,
  SetAxisKey,
  Sidecar,
  TransmittedItem,
} from "../types/sidecar";
import { computeEdges, type ConfirmedEdge } from "./edgeEngine";

export type LineageRole = "source" | "target" | "both" | "none";

export interface SetOverlaySelection {
  axis: SetAxisKey | null;
  member: string | null;
}

export interface NormalizedLineageItem {
  text: string;
  note?: string;
}

export interface NormalizedTransmittedItem extends NormalizedLineageItem {
  to: string;
  form?: string;
  validForm: boolean;
}

export interface NormalizedAbandonedItem extends NormalizedLineageItem {
  what: string;
  why?: string;
  validReason: boolean;
}

export interface NormalizedLineage {
  inherited: NormalizedLineageItem[];
  coined: NormalizedLineageItem[];
  transmitted: NormalizedTransmittedItem[];
  abandoned: NormalizedAbandonedItem[];
  evidence?: string;
  note?: string;
}

export interface NodeOverlayState {
  nodeId: string;
  available: boolean;
  matched: boolean;
  values: string[];
  evidence?: string;
  lineageRole?: LineageRole;
}

export interface SetOverlayResult {
  selection: SetOverlaySelection;
  members: Array<{ value: string; count: number }>;
  nodes: Map<string, NodeOverlayState>;
  lineageEdgeKeys: Set<string>;
  matchedCount: number;
  lineageEdgeCount: number;
}

export const LINEAGE_FORMS = new Set<LineageForm>([
  "Direct",
  "Reinvented",
  "Transformed",
  "Reframed",
]);

export const ABANDON_REASONS = new Set<AbandonReason>([
  "TechnicallyFalsified",
  "EconomicallyInfeasible",
  "SupersededByBetter",
  "Unknown",
]);

export const SET_AXIS_KEYS: SetAxisKey[] = ["7a_solved", "13_econ", "14_lineage"];

export function edgePairKey(source: string, target: string): string {
  return [source, target].sort().join("::");
}

function objectText(value: Record<string, unknown>): string {
  const candidate = value.what ?? value.to ?? value.name ?? value.text ?? value.idea;
  if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  return Object.entries(value)
    .filter(([, item]) => typeof item === "string")
    .map(([key, item]) => `${key}: ${item}`)
    .join(" · ");
}

function normalizePlainItems(value: unknown): NormalizedLineageItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [{ text: item.trim() }] : [];
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const text = objectText(record);
    return text ? [{ text, note: typeof record.note === "string" ? record.note : undefined }] : [];
  });
}

export function normalizeLineageBlock(node: Sidecar): NormalizedLineage {
  const raw = (node.axes["14_lineage"] ?? {}) as unknown as LineageBlock;
  const transmitted = Array.isArray(raw.transmitted)
    ? raw.transmitted.flatMap((item): NormalizedTransmittedItem[] => {
        if (typeof item === "string") {
          const text = item.trim();
          return text ? [{ text, to: text.replace(/^\s*→\s*/, ""), validForm: true }] : [];
        }
        if (!item || typeof item !== "object") return [];
        const typed = item as TransmittedItem;
        const to = typeof typed.to === "string" ? typed.to.trim() : "";
        return [{
          text: to,
          to,
          form: typeof typed.form === "string" ? typed.form : undefined,
          note: typeof typed.note === "string" ? typed.note : undefined,
          validForm: typeof typed.form !== "string" || LINEAGE_FORMS.has(typed.form as LineageForm),
        }];
      })
    : [];
  const abandoned = Array.isArray(raw.abandoned)
    ? raw.abandoned.flatMap((item): NormalizedAbandonedItem[] => {
        if (typeof item === "string") {
          const text = item.trim();
          return text ? [{ text, what: text, validReason: true }] : [];
        }
        if (!item || typeof item !== "object") return [];
        const typed = item as AbandonedItem;
        const what = typeof typed.what === "string" ? typed.what.trim() : "";
        return [{
          text: what,
          what,
          why: typeof typed.why === "string" ? typed.why : undefined,
          note: typeof typed.note === "string" ? typed.note : undefined,
          validReason: typeof typed.why !== "string" || ABANDON_REASONS.has(typed.why as AbandonReason),
        }];
      })
    : [];

  return {
    inherited: normalizePlainItems(raw.inherited),
    coined: normalizePlainItems(raw.coined),
    transmitted,
    abandoned,
    evidence: typeof raw.evidence === "string" ? raw.evidence : undefined,
    note: typeof raw.note === "string" ? raw.note : undefined,
  };
}

export function getSetAxisValues(node: Sidecar, axis: SetAxisKey): string[] {
  if (axis === "14_lineage") {
    const lineage = normalizeLineageBlock(node);
    return [
      ...lineage.inherited.map((item) => item.text),
      ...lineage.coined.map((item) => item.text),
      ...lineage.transmitted.map((item) => item.text),
      ...lineage.abandoned.map((item) => item.text),
    ].filter(Boolean);
  }
  const block = node.axes[axis];
  return Array.isArray(block?.tags)
    ? block.tags.map((tag) => tag.v).filter((value) => value && value !== "Not addressed")
    : [];
}

export function getSetAxisMembers(nodes: Sidecar[], axis: Exclude<SetAxisKey, "14_lineage">) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const value of new Set(getSetAxisValues(node, axis))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const vocab = AXIS_VOCAB[axis] ?? [];
  const order = new Map(vocab.map((value, index) => [value, index]));
  return [...counts.entries()]
    .sort(([a], [b]) => {
      const ai = order.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bi = order.get(b) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi || a.localeCompare(b);
    })
    .map(([value, count]) => ({ value, count }));
}

export function lineageEdges(nodes: Sidecar[]): ConfirmedEdge[] {
  return computeEdges(nodes).confirmed.filter((edge) => edge.type === "lineage");
}

export function directedLineageEnds(edge: ConfirmedEdge): { source: string; target: string } {
  return edge.direction === "from_target"
    ? { source: edge.target, target: edge.source }
    : { source: edge.source, target: edge.target };
}

export function computeSetOverlay(
  nodes: Sidecar[],
  selection: SetOverlaySelection
): SetOverlayResult {
  const nodeStates = new Map<string, NodeOverlayState>();
  const confirmedLineage = lineageEdges(nodes);
  const lineageEdgeKeys = new Set(confirmedLineage.map((edge) => edgePairKey(edge.source, edge.target)));
  const roles = new Map<string, Set<"source" | "target">>();
  for (const edge of confirmedLineage) {
    const directed = directedLineageEnds(edge);
    roles.set(directed.source, new Set([...(roles.get(directed.source) ?? []), "source"]));
    roles.set(directed.target, new Set([...(roles.get(directed.target) ?? []), "target"]));
  }

  for (const node of nodes) {
    const values = selection.axis ? getSetAxisValues(node, selection.axis) : [];
    const roleSet = roles.get(node.id);
    const lineageRole: LineageRole = !roleSet
      ? "none"
      : roleSet.size === 2
        ? "both"
        : roleSet.has("source") ? "source" : "target";
    const available = values.length > 0;
    const matched = selection.axis === "14_lineage"
      ? lineageRole !== "none"
      : Boolean(selection.axis && selection.member && values.includes(selection.member));
    const block = selection.axis ? node.axes[selection.axis] : undefined;
    nodeStates.set(node.id, {
      nodeId: node.id,
      available,
      matched,
      values,
      evidence: typeof block?.evidence === "string" ? block.evidence : undefined,
      lineageRole,
    });
  }

  const members = selection.axis && selection.axis !== "14_lineage"
    ? getSetAxisMembers(nodes, selection.axis)
    : [];
  return {
    selection,
    members,
    nodes: nodeStates,
    lineageEdgeKeys,
    matchedCount: [...nodeStates.values()].filter((state) => state.matched).length,
    lineageEdgeCount: confirmedLineage.length,
  };
}

/** Focus mode wins; otherwise return the overlay opacity for a node. */
export function nodeOverlayOpacity(result: SetOverlayResult, nodeId: string, focusId: string | null): number {
  if (focusId) return nodeId === focusId ? 1 : 0.16;
  if (!result.selection.axis) return 0.88;
  if (result.selection.axis !== "14_lineage" && !result.selection.member) return 0.88;
  const state = result.nodes.get(nodeId);
  return state?.matched ? 1 : state?.available ? 0.24 : 0.12;
}

/** Focus mode wins; otherwise score both endpoints or isolate confirmed lineage. */
export function edgeOverlayOpacity(
  result: SetOverlayResult,
  source: string,
  target: string,
  focusId: string | null
): number {
  if (focusId) return source === focusId || target === focusId ? 1 : 0.08;
  const { axis, member } = result.selection;
  if (!axis || (axis !== "14_lineage" && !member)) return 1;
  if (axis === "14_lineage") return result.lineageEdgeKeys.has(edgePairKey(source, target)) ? 1 : 0.06;
  const a = result.nodes.get(source)?.matched ?? false;
  const b = result.nodes.get(target)?.matched ?? false;
  return a && b ? 1 : a || b ? 0.38 : 0.08;
}

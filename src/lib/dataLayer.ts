// DataLayer: loads digests/*.json sidecars and validates them per
// pim-flow-graph-dev-plan.md §3.3 (controlled-vocab, consistency checks,
// relation symmetry, precursor-mode required axes). Validation failures are
// not thrown — they're surfaced as per-node warnings so the app still
// renders (a broken corpus shouldn't blank the whole page).

import type { Sidecar } from "../types/sidecar";
import { AXIS_VOCAB, VOCAB_EXEMPT_AXES } from "../data/axisVocab";
import { runConsistencyChecks } from "./consistencyRules";
import { normalizeLineageBlock } from "./setAxisEngine";

const digestModules = import.meta.glob<{ default: Sidecar }>(
  "../data/digests/*.json",
  { eager: true }
);

export interface NodeWarning {
  kind: "vocab" | "consistency" | "relation-asymmetric" | "precursor-required-axis" | "set-axis";
  message: string;
}

function validateSetAxes(sidecar: Sidecar, byId: Map<string, Sidecar>): NodeWarning[] {
  const warnings: NodeWarning[] = [];
  const lineage = normalizeLineageBlock(sidecar);
  for (const item of lineage.transmitted) {
    if (!item.to) {
      warnings.push({ kind: "set-axis", message: "14_lineage: transmitted.to가 비어 있음" });
    }
    if (!item.validForm) {
      warnings.push({ kind: "set-axis", message: `14_lineage: transmitted.form "${item.form}"이 허용 값이 아님` });
    }
    if (item.to && byId.has(item.to)) {
      const hasConfirmedRelation = sidecar.relations.some(
        (relation) => relation.type === "lineage" && relation.target === item.to
      );
      if (!hasConfirmedRelation) {
        warnings.push({
          kind: "set-axis",
          message: `14_lineage: 로컬 논문 ${item.to} 전달 기록에 대응 lineage relation이 없음`,
        });
      }
    }
  }
  for (const item of lineage.abandoned) {
    if (!item.validReason) {
      warnings.push({ kind: "set-axis", message: `14_lineage: abandoned.why "${item.why}"가 허용 값이 아님` });
    }
  }
  const lineageHasContent = (node: Sidecar) => {
    const value = normalizeLineageBlock(node);
    return value.inherited.length + value.coined.length + value.transmitted.length + value.abandoned.length > 0;
  };
  for (const relation of sidecar.relations.filter((item) => item.type === "lineage")) {
    const target = byId.get(relation.target);
    if (target && !lineageHasContent(sidecar) && !lineageHasContent(target)) {
      warnings.push({
        kind: "set-axis",
        message: `14_lineage: ${relation.target}와의 lineage relation에 대응하는 계보 데이터가 없음`,
      });
    }
  }
  return warnings;
}

export interface LoadedGraph {
  nodes: Sidecar[];
  warningsById: Record<string, NodeWarning[]>;
}

function validateVocab(sidecar: Sidecar): NodeWarning[] {
  const warnings: NodeWarning[] = [];
  const otherTagValues = new Set(sidecar.other_tags.map((o) => `${o.axis}::${o.value}`));

  for (const [axisKey, block] of Object.entries(sidecar.axes)) {
    if (VOCAB_EXEMPT_AXES.has(axisKey)) continue;
    const vocab = AXIS_VOCAB[axisKey];
    if (!vocab) continue; // axis not in snapshot (e.g. rarely used) — skip rather than false-flag
    for (const tag of block.tags) {
      if (tag.v.startsWith("Other: ")) {
        const value = tag.v.slice("Other: ".length);
        if (!otherTagValues.has(`${axisKey}::${value}`)) {
          warnings.push({
            kind: "vocab",
            message: `${axisKey}: "Other: ${value}"가 other_tags[]에 등재되지 않음`,
          });
        }
        continue;
      }
      if (!vocab.includes(tag.v)) {
        warnings.push({
          kind: "vocab",
          message: `${axisKey}: "${tag.v}"가 통제어휘에 없음 (Other: 접두 필요)`,
        });
      }
    }
  }
  return warnings;
}

function validatePrecursorAxes(sidecar: Sidecar): NodeWarning[] {
  if (sidecar.mode !== "precursor") return [];
  const warnings: NodeWarning[] = [];
  const econ = sidecar.axes["13_econ"];
  if (!econ || econ.tags.length === 0 || econ.tags.every((t) => t.v === "Not addressed")) {
    warnings.push({
      kind: "precursor-required-axis",
      message: "precursor 모드인데 13_econ이 비어 있음 (필수 축)",
    });
  }
  const lineage = sidecar.axes["14_lineage"] as
    | (Sidecar["axes"][string] & { inherited?: unknown[]; transmitted?: unknown[] })
    | undefined;
  const lineageEmpty =
    !lineage ||
    (!(lineage.inherited as unknown[] | undefined)?.length &&
      !(lineage.transmitted as unknown[] | undefined)?.length);
  if (lineageEmpty) {
    warnings.push({
      kind: "precursor-required-axis",
      message: "precursor 모드인데 14_lineage(inherited/transmitted)가 비어 있음 (필수 축)",
    });
  }
  return warnings;
}

// Only directional relation types care about a reciprocal declaration.
// Undirected types (competes/complements/disjoint) are declare-once per the
// sidecar schema: the aware side (usually the newer paper) declares the edge
// exactly once, and the older paper's sidecar — written before the newer one
// existed — legitimately has no back-relation. Warning on those is a false
// positive. See axis-taxonomy relation rules / sidecar-schema $comment_relations.
const DIRECTED_RELATION_TYPES = new Set(["lineage", "premise", "subsumes"]);

function validateRelationSymmetry(sidecar: Sidecar, byId: Map<string, Sidecar>): NodeWarning[] {
  const warnings: NodeWarning[] = [];
  for (const rel of sidecar.relations) {
    if (!DIRECTED_RELATION_TYPES.has(rel.type)) continue; // undirected → declare-once, no reciprocal needed
    const target = byId.get(rel.target);
    if (!target) continue; // target not in corpus yet — not this node's fault
    const hasBack = target.relations.some((r) => r.target === sidecar.id);
    if (!hasBack) {
      warnings.push({
        kind: "relation-asymmetric",
        message: `${sidecar.id} → ${rel.target} (${rel.type}) 관계가 단방향 — 대상 사이드카에 대응 relation 없음`,
      });
    }
  }
  return warnings;
}

export function loadGraph(): LoadedGraph {
  const nodes = Object.values(digestModules)
    .map((m) => m.default)
    .sort((a, b) => a.id.localeCompare(b.id));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const warningsById: Record<string, NodeWarning[]> = {};

  for (const node of nodes) {
    const warnings: NodeWarning[] = [
      ...validateVocab(node),
      ...runConsistencyChecks(node).map((v) => ({
        kind: "consistency" as const,
        message: `[${v.check}] ${v.message}`,
      })),
      ...validateRelationSymmetry(node, byId),
      ...validatePrecursorAxes(node),
      ...validateSetAxes(node, byId),
    ];
    warningsById[node.id] = warnings;
    for (const w of warnings) {
      console.warn(`[DataLayer] ${node.id}: ${w.message}`);
    }
  }

  return { nodes, warningsById };
}

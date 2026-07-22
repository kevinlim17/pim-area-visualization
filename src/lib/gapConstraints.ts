export interface GapConstraintResult {
  ruleId: string;
  message: string;
}

type AxisValues = Record<string, readonly string[]>;

interface GapConstraint {
  ruleId: string;
  axes: readonly string[];
  evaluate: (values: AxisValues) => string | null;
}

function hasAny(values: readonly string[], candidates: readonly string[]): boolean {
  return values.some((value) => candidates.includes(value));
}

export const GAP_CONSTRAINTS: readonly GapConstraint[] = [
  {
    ruleId: "#1",
    axes: ["1_location", "2a_approach"],
    evaluate: (values) =>
      hasAny(values["1_location"], ["Cell", "DataArray", "RowBuffer"]) &&
      !hasAny(values["2a_approach"], ["PUM", "Hybrid"])
        ? "Location∈{Cell,DataArray,RowBuffer}이면 Approach=PUM/Hybrid가 자연스러움"
        : null,
  },
  {
    ruleId: "#2",
    axes: ["1_location", "2a_approach"],
    evaluate: (values) =>
      hasAny(values["1_location"], ["LogicDie", "BufferChip", "NearMemDevice", "MemoryController"]) &&
      !hasAny(values["2a_approach"], ["PNM", "Hybrid"])
        ? "Location∈{LogicDie,BufferChip,NearMemDevice,MemoryController}이면 Approach=PNM/Hybrid가 자연스러움"
        : null,
  },
  {
    ruleId: "#3",
    axes: ["2a_approach", "3_programmability"],
    evaluate: (values) =>
      values["2a_approach"].includes("PUM") &&
      !values["2a_approach"].includes("Hybrid") &&
      values["3_programmability"].includes("ProgrammableCore")
        ? "Approach=PUM(비Hybrid) + Programmability=ProgrammableCore는 모순 가능성"
        : null,
  },
  {
    ruleId: "#4",
    axes: ["1_location", "9a_hw_change"],
    evaluate: (values) =>
      values["1_location"].length > 0 &&
      values["1_location"].every((value) => value === "HostOnly") &&
      !values["9a_hw_change"].includes("NoHWChange")
        ? "Location=HostOnly이면 HW Change=NoHWChange여야 함"
        : null,
  },
  {
    ruleId: "#5",
    axes: ["2b_technology", "4a_parallelism"],
    evaluate: (values) =>
      hasAny(values["2b_technology"], ["HBM", "HMC"]) &&
      !hasAny(values["4a_parallelism"], ["Vault", "PseudoChannel", "Channel"])
        ? "Technology∈{HBM,HMC}이면 Vault/PseudoChannel/Channel 병렬성이 자연스러움"
        : null,
  },
  {
    ruleId: "#6",
    axes: ["5b_coherency", "4b_offload"],
    evaluate: (values) =>
      values["5b_coherency"].includes("NoCoherence") && values["4b_offload"].includes("Instruction")
        ? "Coherency=NoCoherence + Offload=Instruction은 프로그래밍이 사실상 불가능"
        : null,
  },
  {
    ruleId: "#7",
    axes: ["11a_eval_method", "11c_validation"],
    evaluate: (values) =>
      values["11a_eval_method"].includes("RealHardware") && values["11c_validation"].includes("Unvalidated")
        ? "Evaluation=RealHardware + Validation=Unvalidated는 모순"
        : null,
  },
  {
    ruleId: "#12",
    axes: ["1_location", "5b_coherency"],
    evaluate: (values) =>
      hasAny(values["1_location"], ["SameDie-Processor", "SameDie-Peer"]) &&
      !values["5b_coherency"].includes("Dissolved")
        ? "Location=SameDie-*이면 Coherency=Dissolved가 자연스러움"
        : null,
  },
  {
    ruleId: "#13",
    axes: ["1_location", "9a_hw_change", "2a_approach"],
    evaluate: (values) =>
      values["1_location"].includes("Bank") &&
      hasAny(values["9a_hw_change"], ["PeripheryAddition", "LogicDieAddition", "NewDevice", "MonolithicIntegration"]) &&
      !hasAny(values["2a_approach"], ["PNM", "Hybrid"])
        ? "Location=Bank + 디지털 로직 추가 신호이면 Approach=PNM/Hybrid가 자연스러움"
        : null,
  },
];

export function evaluateGapConstraints(values: AxisValues): GapConstraintResult[] {
  return GAP_CONSTRAINTS.flatMap((constraint) => {
    if (!constraint.axes.every((axisKey) => (values[axisKey]?.length ?? 0) > 0)) return [];
    const message = constraint.evaluate(values);
    return message ? [{ ruleId: constraint.ruleId, message }] : [];
  });
}

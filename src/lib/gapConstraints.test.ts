import { describe, expect, it } from "vitest";
import { evaluateGapConstraints } from "./gapConstraints";

const cases = [
  ["#1", { "1_location": ["Cell"], "2a_approach": ["PNM"] }],
  ["#2", { "1_location": ["LogicDie"], "2a_approach": ["PUM"] }],
  ["#3", { "2a_approach": ["PUM"], "3_programmability": ["ProgrammableCore"] }],
  ["#4", { "1_location": ["HostOnly"], "9a_hw_change": ["NewDevice"] }],
  ["#5", { "2b_technology": ["HBM"], "4a_parallelism": ["Bank"] }],
  ["#6", { "5b_coherency": ["NoCoherence"], "4b_offload": ["Instruction"] }],
  ["#7", { "11a_eval_method": ["RealHardware"], "11c_validation": ["Unvalidated"] }],
  ["#12", { "1_location": ["SameDie-Peer"], "5b_coherency": ["NoCoherence"] }],
  ["#13", { "1_location": ["Bank"], "9a_hw_change": ["LogicDieAddition"], "2a_approach": ["PUM"] }],
] as const;

describe("Gap constraints", () => {
  it.each(cases)("classifies %s from the shared rule set", (ruleId, values) => {
    expect(evaluateGapConstraints(values).map((result) => result.ruleId)).toContain(ruleId);
  });

  it("does not evaluate a rule when a required axis is absent", () => {
    expect(evaluateGapConstraints({ "1_location": ["Cell"] })).toEqual([]);
  });
});

// Display labels for all 26 sidecar axis keys, transcribed from the section
// headings in axis-taxonomy.md. Used by AxisSelector to list every axis
// (not just the 6 ordinal ones M1 can plot) so the "coming later" axes are
// visible rather than silently missing.

export const AXIS_LABELS: Record<string, string> = {
  "1_location": "1. Computation Location",
  "2a_approach": "2a. Approach (PUM/PNM)",
  "2b_technology": "2b. Memory Technology",
  "3_programmability": "3. Programmability",
  "4a_parallelism": "4a. Parallelism Level",
  "4b_offload": "4b. Offload Granularity",
  "4c_data_gran": "4c. Data Granularity",
  "5a_comm": "5a. Communication",
  "5b_coherency": "5b. Coherency Model",
  "5c_consistency": "5c. Consistency Model",
  "6a_workload_analysis": "6a. Workload Analysis",
  "6b_workload_class": "6b. Workload Classification",
  "7a_solved": "7a. Bottleneck Solved",
  "8a_offload_mech": "8a. Offload Mechanism",
  "8b_os_runtime": "8b. OS/Runtime Support",
  "9a_hw_change": "9a. HW Change",
  "9b_verify": "9b. Verification Target",
  "10_application": "10. Application Field",
  "11a_eval_method": "11a. Evaluation Method",
  "11b_tools": "11b. Tools",
  "11c_validation": "11c. Validation Quality",
  "11d_baseline": "11d. Baseline",
  "12a_translation": "12a. Address Translation",
  "12b_mapping": "12b. Data Mapping",
  "13_econ": "13. Industrial/Economic",
  "14_lineage": "14. Idea Lineage",
};

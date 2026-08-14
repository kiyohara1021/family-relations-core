import assert from "node:assert/strict";
import test from "node:test";

import { assertValidFamilyGraph, validateFamilyGraph } from "../dist/index.js";

test("accepts a valid anonymous graph", () => {
  const issues = validateFamilyGraph({
    people: [
      { id: "p1", generation: 0 },
      { id: "p2", generation: 0 },
      { id: "p3", generation: 1, parentIds: ["p1", "p2"] },
    ],
    partnerships: [{ id: "r1", personIds: ["p1", "p2"], status: "current" }],
  });
  assert.deepEqual(issues, []);
});

test("reports unknown parents and generation mismatches", () => {
  const issues = validateFamilyGraph({
    people: [
      { id: "root", generation: 0 },
      { id: "child", generation: 3, parentIds: ["root", "missing"] },
    ],
  });
  assert.ok(issues.some((issue) => issue.code === "unknown-parent"));
  assert.ok(issues.some((issue) => issue.code === "generation-mismatch"));
});

test("detects ancestry cycles without recursion", () => {
  const issues = validateFamilyGraph({
    people: [
      { id: "a", parentIds: ["c"] },
      { id: "b", parentIds: ["a"] },
      { id: "c", parentIds: ["b"] },
    ],
  });
  const cycle = issues.find((issue) => issue.code === "ancestry-cycle");
  assert.ok(cycle);
  assert.ok(cycle.path.length >= 4);
});

test("validates dates and configurable structural limits", () => {
  const graph = {
    people: [
      { id: "a" },
      { id: "b" },
      { id: "c" },
      { id: "d", parentIds: ["a", "b", "c"], birthDate: { year: 2024, month: 2, day: 30 } },
    ],
    partnerships: [
      { personIds: ["a", "b"], status: "current" },
      { personIds: ["a", "c"], status: "current" },
    ],
  };
  const defaults = validateFamilyGraph(graph);
  assert.ok(defaults.some((issue) => issue.code === "too-many-parents"));
  assert.ok(defaults.some((issue) => issue.code === "invalid-date"));
  assert.ok(defaults.some((issue) => issue.code === "too-many-current-partners"));

  const configured = validateFamilyGraph(graph, { maxParents: 3, maxCurrentPartners: 2 });
  assert.ok(!configured.some((issue) => issue.code === "too-many-parents"));
  assert.ok(!configured.some((issue) => issue.code === "too-many-current-partners"));
});

test("assert helper includes stable issue codes", () => {
  assert.throws(
    () => assertValidFamilyGraph({ people: [{ id: "same" }, { id: "same" }] }),
    /duplicate-person-id/,
  );
});

test("handles a 5,000-person chain without exhausting the stack", () => {
  const people = Array.from({ length: 5_000 }, (_, index) => ({
    id: `p${index}`,
    generation: index,
    ...(index === 0 ? {} : { parentIds: [`p${index - 1}`] }),
  }));
  assert.deepEqual(validateFamilyGraph({ people }), []);
});

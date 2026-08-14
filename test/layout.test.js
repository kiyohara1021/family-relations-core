import assert from "node:assert/strict";
import test from "node:test";

import { layoutFamilyGraph, solveLayoutRow } from "../dist/index.js";

function byId(layout, id) {
  return layout.nodes.find((node) => node.id === id);
}

test("places partners together and children below their parents", () => {
  const layout = layoutFamilyGraph({
    people: [
      { id: "a", generation: 0 },
      { id: "b", generation: 0 },
      { id: "child", generation: 1, parentIds: ["a", "b"] },
    ],
    partnerships: [{ personIds: ["a", "b"], status: "current" }],
  });
  assert.equal(byId(layout, "a").y, byId(layout, "b").y);
  assert.ok(byId(layout, "child").y > byId(layout, "a").y);
  assert.equal(layout.edges.filter((edge) => edge.kind === "parent-child").length, 2);
  assert.equal(layout.edges.filter((edge) => edge.kind === "partnership").length, 1);
});

test("keeps every card in a row from overlapping", () => {
  const people = [
    { id: "left-parent", generation: 0 },
    { id: "right-parent", generation: 0 },
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `child-${index}`,
      generation: 1,
      parentIds: [index < 4 ? "left-parent" : "right-parent"],
    })),
  ];
  const layout = layoutFamilyGraph({ people });
  for (const [index, node] of layout.nodes.entries()) {
    for (const other of layout.nodes.slice(index + 1)) {
      if (node.y !== other.y) continue;
      assert.ok(node.x + node.width <= other.x || other.x + other.width <= node.x);
    }
  }
});

test("infers generations and supports negative explicit generations", () => {
  const layout = layoutFamilyGraph({
    people: [
      { id: "ancestor", generation: -1 },
      { id: "parent", generation: 0, parentIds: ["ancestor"] },
      { id: "child", parentIds: ["parent"] },
    ],
  });
  assert.deepEqual(layout.generations, [-1, 0, 1]);
  assert.ok(byId(layout, "ancestor").y < byId(layout, "parent").y);
  assert.ok(byId(layout, "parent").y < byId(layout, "child").y);
});

test("row solver preserves order and distributes collisions", () => {
  const positions = solveLayoutRow([
    { width: 100, desiredLeft: 500 },
    { width: 100, desiredLeft: 500 },
    { width: 100, desiredLeft: 500 },
  ], 20);
  assert.ok(positions[1] >= positions[0] + 120);
  assert.ok(positions[2] >= positions[1] + 120);
  assert.equal((positions[0] + positions[2] + 100) / 2, 550);
});

test("returns deterministic coordinates", () => {
  const graph = {
    people: [
      { id: "p1" },
      { id: "p2" },
      { id: "p3", parentIds: ["p1", "p2"] },
    ],
    partnerships: [{ personIds: ["p1", "p2"], status: "current" }],
  };
  assert.deepEqual(layoutFamilyGraph(graph), layoutFamilyGraph(graph));
});

test("handles empty graphs", () => {
  const layout = layoutFamilyGraph({ people: [] });
  assert.deepEqual(layout.nodes, []);
  assert.ok(layout.width > 0 && layout.height > 0);
});

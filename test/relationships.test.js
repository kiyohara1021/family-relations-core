import assert from "node:assert/strict";
import test from "node:test";

import { describeRelationship, relationshipLabels } from "../dist/index.js";

const graph = {
  people: [
    { id: "grandparent", sex: "female", birthDate: { year: 1940 } },
    { id: "parent", sex: "male", parentIds: ["grandparent"], birthDate: { year: 1965 } },
    { id: "aunt", sex: "female", parentIds: ["grandparent"], birthDate: { year: 1960 } },
    { id: "self", sex: "female", parentIds: ["parent"], birthDate: { year: 1990 } },
    { id: "sibling", sex: "male", parentIds: ["parent"], birthDate: { year: 1992 } },
    { id: "cousin", sex: "female", parentIds: ["aunt"], birthDate: { year: 1988 } },
    { id: "niece", sex: "female", parentIds: ["sibling"], birthDate: { year: 2020 } },
    { id: "spouse", sex: "male" },
    { id: "spouse-parent", sex: "female" },
    { id: "sibling-spouse", sex: "female" },
  ],
  partnerships: [
    { personIds: ["self", "spouse"], status: "current" },
    { personIds: ["spouse", "spouse-parent"], status: "divorced" },
    { personIds: ["sibling", "sibling-spouse"], status: "current" },
  ],
};

test("describes direct and collateral blood relationships", () => {
  assert.equal(describeRelationship(graph, "self", "grandparent").label, "grandmother");
  assert.equal(describeRelationship(graph, "self", "sibling").label, "brother");
  assert.equal(describeRelationship(graph, "self", "aunt").label, "aunt");
  assert.equal(describeRelationship(graph, "self", "niece").label, "niece");
  const cousin = describeRelationship(graph, "self", "cousin");
  assert.equal(cousin.label, "first cousin");
  assert.equal(cousin.cousinDegree, 1);
  assert.equal(cousin.removed, 0);
});

test("supports Japanese labels and elder/younger aunt distinction", () => {
  assert.equal(describeRelationship(graph, "self", "grandparent", { locale: "ja" }).label, "祖母");
  assert.equal(describeRelationship(graph, "grandparent", "self", { locale: "ja" }).label, "孫");
  assert.equal(describeRelationship(graph, "self", "aunt", { locale: "ja" }).label, "伯母");
  assert.equal(describeRelationship(graph, "self", "cousin", { locale: "ja" }).label, "従姉妹");
});

test("adds spouse and relative-spouse relationships without mutating data", () => {
  assert.equal(describeRelationship(graph, "self", "spouse").label, "spouse");
  assert.equal(describeRelationship(graph, "self", "sibling-spouse").label, "brother's spouse");
  const labels = relationshipLabels(graph, "self", { locale: "ja" });
  assert.equal(labels.get("sibling-spouse").label, "兄弟の配偶者");
  assert.equal(labels.size, graph.people.length);
});

test("reports unrelated people and rejects unknown IDs", () => {
  assert.equal(describeRelationship(graph, "self", "spouse-parent").kind, "unrelated");
  assert.throws(() => describeRelationship(graph, "missing", "self"), RangeError);
});

test("handles first cousins once removed", () => {
  const extended = {
    ...graph,
    people: [...graph.people, { id: "cousin-child", parentIds: ["cousin"] }],
  };
  const relationship = describeRelationship(extended, "self", "cousin-child");
  assert.equal(relationship.label, "first cousin once removed");
  assert.equal(relationship.removed, 1);
});

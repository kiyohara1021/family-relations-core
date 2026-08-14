import assert from "node:assert/strict";
import test from "node:test";

import { getBirthOrder } from "../dist/index.js";

const people = [
  { id: "parent-a" },
  { id: "parent-b" },
  { id: "daughter-2", sex: "female", birthDate: { year: 2003 }, parentIds: ["parent-b", "parent-a"] },
  { id: "son-1", sex: "male", birthDate: { year: 2000 }, parentIds: ["parent-a", "parent-b"] },
  { id: "daughter-1", sex: "female", birthDate: { year: 1998 }, parentIds: ["parent-a", "parent-b"] },
  { id: "son-2", sex: "male", birthDate: { year: 2002 }, parentIds: ["parent-a", "parent-b"] },
];

test("computes Japanese son and daughter order independently", () => {
  assert.equal(getBirthOrder("daughter-1", people, { locale: "ja" }).label, "長女");
  assert.equal(getBirthOrder("daughter-2", people, { locale: "ja" }).label, "次女");
  assert.equal(getBirthOrder("son-1", people, { locale: "ja" }).label, "長男");
  assert.equal(getBirthOrder("son-2", people, { locale: "ja" }).label, "次男");
});

test("normalizes parent order and supports English output", () => {
  const result = getBirthOrder("daughter-2", people, { locale: "en" });
  assert.equal(result.label, "second daughter");
  assert.deepEqual(result.siblingIds, ["daughter-1", "daughter-2"]);
});

test("can rank all siblings regardless of sex", () => {
  const result = getBirthOrder("son-1", people, { locale: "en", sameSexOnly: false });
  assert.equal(result.rank, 2);
  assert.equal(result.label, "second son");
});

test("places missing dates after known dates with stable IDs", () => {
  const undated = [
    { id: "parent" },
    { id: "b", sex: "male", parentIds: ["parent"] },
    { id: "a", sex: "male", parentIds: ["parent"] },
  ];
  assert.equal(getBirthOrder("a", undated, { locale: "ja" }).label, "長男");
  assert.equal(getBirthOrder("b", undated, { locale: "ja" }).label, "次男");
});

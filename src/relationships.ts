import type {
  FamilyGraph,
  FamilyPartnership,
  FamilyPerson,
  Locale,
  Relationship,
} from "./types.js";

type BloodPath = {
  up: number;
  down: number;
  ancestorId: string;
};

function birthKey(person?: FamilyPerson): number | undefined {
  const date = person?.birthDate;
  return date ? date.year * 10_000 + (date.month ?? 1) * 100 + (date.day ?? 1) : undefined;
}

function ancestorDepths(startId: string, byId: ReadonlyMap<string, FamilyPerson>): Map<string, number> {
  const depths = new Map<string, number>([[startId, 0]]);
  const queue = [startId];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    if (!id) continue;
    const depth = depths.get(id) ?? 0;
    for (const parentId of byId.get(id)?.parentIds ?? []) {
      if (!byId.has(parentId) || depths.has(parentId)) continue;
      depths.set(parentId, depth + 1);
      queue.push(parentId);
    }
  }
  return depths;
}

function closestBloodPath(fromId: string, toId: string, byId: ReadonlyMap<string, FamilyPerson>): BloodPath | undefined {
  const fromDepths = ancestorDepths(fromId, byId);
  const toDepths = ancestorDepths(toId, byId);
  let best: BloodPath | undefined;
  for (const [ancestorId, down] of toDepths) {
    const up = fromDepths.get(ancestorId);
    if (up === undefined) continue;
    const candidate = { up, down, ancestorId };
    if (
      !best
      || up + down < best.up + best.down
      || (up + down === best.up + best.down && up < best.up)
      || (up + down === best.up + best.down && up === best.up && ancestorId < best.ancestorId)
    ) {
      best = candidate;
    }
  }
  return best;
}

function sexWord(person: FamilyPerson, male: string, female: string, neutral: string): string {
  return person.sex === "male" ? male : person.sex === "female" ? female : neutral;
}

function japaneseAncestor(person: FamilyPerson, depth: number): string {
  const fixed = [
    ["父", "母", "親"],
    ["祖父", "祖母", "祖父母"],
    ["曾祖父", "曾祖母", "曾祖父母"],
    ["高祖父", "高祖母", "高祖父母"],
  ] as const;
  const terms = fixed[depth - 1];
  return terms ? sexWord(person, terms[0], terms[1], terms[2]) : `${depth}代前の祖先`;
}

function japaneseDescendant(person: FamilyPerson, depth: number): string {
  if (depth === 1) return sexWord(person, "息子", "娘", "子");
  if (depth === 2) return sexWord(person, "孫息子", "孫娘", "孫");
  const fixed = ["", "", "曾孫", "玄孫"];
  return fixed[depth] ?? `${depth}代後の子孫`;
}

function englishAncestor(person: FamilyPerson, depth: number): string {
  const parent = sexWord(person, "father", "mother", "parent");
  if (depth === 1) return parent;
  const grandparent = sexWord(person, "grandfather", "grandmother", "grandparent");
  if (depth === 2) return grandparent;
  if (depth <= 5) return `${"great-".repeat(depth - 2)}${grandparent}`;
  return `${depth}-generation ancestor`;
}

function englishDescendant(person: FamilyPerson, depth: number): string {
  const child = sexWord(person, "son", "daughter", "child");
  if (depth === 1) return child;
  const grandchild = sexWord(person, "grandson", "granddaughter", "grandchild");
  if (depth === 2) return grandchild;
  if (depth <= 5) return `${"great-".repeat(depth - 2)}${grandchild}`;
  return `${depth}-generation descendant`;
}

function ordinalWord(value: number): string {
  return ["", "first", "second", "third", "fourth", "fifth"][value] ?? `${value}th`;
}

function removedWord(value: number): string {
  return ["", "once", "twice", "three times"][value] ?? `${value} times`;
}

function collateralSeniority(
  target: FamilyPerson,
  path: BloodPath,
  fromId: string,
  people: readonly FamilyPerson[],
  byId: ReadonlyMap<string, FamilyPerson>,
): "elder" | "younger" | undefined {
  const fromDepths = ancestorDepths(fromId, byId);
  const directBranch = people.find(
    (person) => fromDepths.get(person.id) === path.up - 1 && person.parentIds?.includes(path.ancestorId),
  );
  const targetBirth = birthKey(target);
  const branchBirth = birthKey(directBranch);
  if (targetBirth === undefined || branchBirth === undefined || targetBirth === branchBirth) return undefined;
  return targetBirth < branchBirth ? "elder" : "younger";
}

function japaneseBloodLabel(
  target: FamilyPerson,
  path: BloodPath,
  seniority?: "elder" | "younger",
): string {
  const { up, down } = path;
  if (up === 0 && down === 0) return "自分";
  if (down === 0) return japaneseAncestor(target, up);
  if (up === 0) return japaneseDescendant(target, down);
  if (up === 1 && down === 1) return sexWord(target, "兄弟", "姉妹", "きょうだい");
  if (down === 1) {
    const prefix = up === 2 ? "" : up === 3 ? "大" : `${up - 1}代上の`;
    if (seniority === "elder") return sexWord(target, `${prefix}伯父`, `${prefix}伯母`, `${prefix}伯父・伯母`);
    if (seniority === "younger") return sexWord(target, `${prefix}叔父`, `${prefix}叔母`, `${prefix}叔父・叔母`);
    return sexWord(target, `${prefix}おじ`, `${prefix}おば`, `${prefix}おじ・おば`);
  }
  if (up === 1) {
    const prefix = down === 2 ? "" : down === 3 ? "大" : `${down - 1}代下の`;
    return sexWord(target, `${prefix}甥`, `${prefix}姪`, `${prefix}甥・姪`);
  }
  const degree = Math.min(up, down) - 1;
  const removed = Math.abs(up - down);
  if (degree === 1 && removed === 0) return sexWord(target, "従兄弟", "従姉妹", "いとこ");
  const degreeLabel = ["", "いとこ", "はとこ", "みいとこ"][degree] ?? `${degree}親等のいとこ`;
  return removed === 0 ? degreeLabel : `${degreeLabel}（${removed}世代違い）`;
}

function englishBloodLabel(target: FamilyPerson, path: BloodPath): string {
  const { up, down } = path;
  if (up === 0 && down === 0) return "self";
  if (down === 0) return englishAncestor(target, up);
  if (up === 0) return englishDescendant(target, down);
  if (up === 1 && down === 1) return sexWord(target, "brother", "sister", "sibling");
  if (down === 1) {
    const base = sexWord(target, "uncle", "aunt", "aunt or uncle");
    return up === 2 ? base : `${"great-".repeat(Math.max(0, up - 3))}grand-${base}`;
  }
  if (up === 1) {
    const base = sexWord(target, "nephew", "niece", "niece or nephew");
    return down === 2 ? base : `${"great-".repeat(Math.max(0, down - 3))}grand-${base}`;
  }
  const degree = Math.min(up, down) - 1;
  const removed = Math.abs(up - down);
  return `${ordinalWord(degree)} cousin${removed ? ` ${removedWord(removed)} removed` : ""}`;
}

function relationshipKind(path: BloodPath): Relationship["kind"] {
  if (path.up === 0 && path.down === 0) return "self";
  if (path.down === 0) return "ancestor";
  if (path.up === 0) return "descendant";
  if (path.up === 1 && path.down === 1) return "sibling";
  if (path.down === 1) return "aunt-uncle";
  if (path.up === 1) return "niece-nephew";
  return "cousin";
}

function bloodRelationship(
  graph: FamilyGraph,
  fromId: string,
  toId: string,
  locale: Locale,
): Relationship | undefined {
  const byId = new Map(graph.people.map((person) => [person.id, person]));
  const target = byId.get(toId);
  if (!target) return undefined;
  const path = closestBloodPath(fromId, toId, byId);
  if (!path) return undefined;
  const seniority = path.down === 1 && path.up >= 2
    ? collateralSeniority(target, path, fromId, graph.people, byId)
    : undefined;
  const degree = path.up >= 2 && path.down >= 2 ? Math.min(path.up, path.down) - 1 : undefined;
  const removed = degree === undefined ? undefined : Math.abs(path.up - path.down);
  return {
    kind: relationshipKind(path),
    label: locale === "ja" ? japaneseBloodLabel(target, path, seniority) : englishBloodLabel(target, path),
    fromId,
    toId,
    up: path.up,
    down: path.down,
    commonAncestorId: path.ancestorId,
    ...(degree === undefined ? {} : { cousinDegree: degree, removed: removed ?? 0 }),
  };
}

function directPartnership(
  partnerships: readonly FamilyPartnership[],
  fromId: string,
  toId: string,
): FamilyPartnership | undefined {
  return partnerships.find((partnership) => partnership.personIds.includes(fromId) && partnership.personIds.includes(toId));
}

function activePartnerships(partnerships: readonly FamilyPartnership[]): readonly FamilyPartnership[] {
  return partnerships.filter((partnership) => partnership.status !== "divorced");
}

export function describeRelationship(
  graph: FamilyGraph,
  fromId: string,
  toId: string,
  options: { locale?: Locale } = {},
): Relationship {
  const locale = options.locale ?? "en";
  const byId = new Map(graph.people.map((person) => [person.id, person]));
  if (!byId.has(fromId)) throw new RangeError(`Unknown person '${fromId}'.`);
  if (!byId.has(toId)) throw new RangeError(`Unknown person '${toId}'.`);

  const blood = bloodRelationship(graph, fromId, toId, locale);
  if (blood) return blood;

  const partnerships = graph.partnerships ?? [];
  const direct = directPartnership(partnerships, fromId, toId);
  if (direct) {
    const former = direct.status === "divorced";
    return {
      kind: "spouse",
      label: locale === "ja" ? (former ? "元配偶者" : "配偶者") : (former ? "former spouse" : "spouse"),
      fromId,
      toId,
      up: 0,
      down: 0,
    };
  }

  for (const partnership of activePartnerships(partnerships)) {
    if (!partnership.personIds.includes(fromId)) continue;
    const spouseId = partnership.personIds.find((id) => id !== fromId);
    if (!spouseId) continue;
    const spouseBlood = bloodRelationship(graph, spouseId, toId, locale);
    if (spouseBlood && spouseBlood.kind !== "self") {
      return {
        ...spouseBlood,
        kind: "spouse-relative",
        label: locale === "ja" ? `配偶者の${spouseBlood.label}` : `spouse's ${spouseBlood.label}`,
        fromId,
        viaId: spouseId,
      };
    }
  }

  for (const partnership of [...partnerships].sort((left, right) => Number(right.status === "current") - Number(left.status === "current"))) {
    if (!partnership.personIds.includes(toId)) continue;
    const relativeId = partnership.personIds.find((id) => id !== toId);
    if (!relativeId) continue;
    const relative = bloodRelationship(graph, fromId, relativeId, locale);
    if (!relative) continue;
    const former = partnership.status === "divorced";
    return {
      ...relative,
      kind: "relative-spouse",
      label: locale === "ja"
        ? `${relative.label}の${former ? "元配偶者" : "配偶者"}`
        : `${relative.label}'s ${former ? "former spouse" : "spouse"}`,
      toId,
      viaId: relativeId,
    };
  }

  return {
    kind: "unrelated",
    label: locale === "ja" ? "関係不明" : "unrelated",
    fromId,
    toId,
    up: 0,
    down: 0,
  };
}

export function relationshipLabels(
  graph: FamilyGraph,
  fromId: string,
  options: { locale?: Locale } = {},
): ReadonlyMap<string, Relationship> {
  return new Map(graph.people.map((person) => [person.id, describeRelationship(graph, fromId, person.id, options)]));
}

import type {
  FamilyGraph,
  FamilyLayout,
  FamilyPerson,
  LayoutEdge,
  LayoutNode,
  LayoutOptions,
} from "./types.js";

type Household = {
  key: string;
  members: readonly FamilyPerson[];
  generation: number;
  width: number;
  sourceOrder: number;
  parentKeys: readonly string[];
  childKeys: readonly string[];
};

const DEFAULTS: Required<LayoutOptions> = {
  cardWidth: 180,
  cardHeight: 104,
  partnerGap: 28,
  householdGap: 48,
  rowGap: 104,
  padding: 64,
};

class DisjointSet {
  readonly #parent = new Map<string, string>();

  add(value: string): void {
    if (!this.#parent.has(value)) this.#parent.set(value, value);
  }

  find(value: string): string {
    const parent = this.#parent.get(value);
    if (!parent) return value;
    if (parent === value) return value;
    const root = this.find(parent);
    this.#parent.set(value, root);
    return root;
  }

  union(left: string, right: string): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.#parent.set(rightRoot, leftRoot);
  }
}

function inferGenerations(people: readonly FamilyPerson[]): ReadonlyMap<string, number> {
  const byId = new Map(people.map((person) => [person.id, person]));
  const generations = new Map<string, number>();
  for (const person of people) {
    if (person.generation !== undefined) generations.set(person.id, person.generation);
    else if (!person.parentIds?.some((id) => byId.has(id))) generations.set(person.id, 0);
  }

  for (let pass = 0; pass < people.length; pass += 1) {
    let changed = false;
    for (const person of people) {
      if (generations.has(person.id)) continue;
      const knownParents = (person.parentIds ?? [])
        .map((id) => generations.get(id))
        .filter((value): value is number => value !== undefined);
      if (knownParents.length === 0) continue;
      generations.set(person.id, Math.max(...knownParents) + 1);
      changed = true;
    }
    if (!changed) break;
  }
  for (const person of people) if (!generations.has(person.id)) generations.set(person.id, 0);
  return generations;
}

export function solveLayoutRow(
  items: readonly { width: number; desiredLeft: number; weight?: number }[],
  gap: number,
): readonly number[] {
  const bases: number[] = [];
  const blocks: Array<{ value: number; weight: number; count: number }> = [];
  let base = 0;

  for (const item of items) {
    bases.push(base);
    let block = { value: item.desiredLeft - base, weight: item.weight ?? 1, count: 1 };
    base += item.width + gap;
    while (blocks.length > 0) {
      const previous = blocks[blocks.length - 1];
      if (!previous || previous.value < block.value) break;
      blocks.pop();
      const weight = previous.weight + block.weight;
      block = {
        value: (previous.value * previous.weight + block.value * block.weight) / weight,
        weight,
        count: previous.count + block.count,
      };
    }
    blocks.push(block);
  }

  const values: number[] = [];
  for (const block of blocks) for (let index = 0; index < block.count; index += 1) values.push(block.value);
  return values.map((value, index) => value + (bases[index] ?? 0));
}

function createHouseholds(graph: FamilyGraph, config: Required<LayoutOptions>): {
  households: readonly Household[];
  personHousehold: ReadonlyMap<string, string>;
} {
  const byId = new Map(graph.people.map((person) => [person.id, person]));
  const generations = inferGenerations(graph.people);
  const sets = new DisjointSet();
  graph.people.forEach((person) => sets.add(person.id));
  for (const partnership of graph.partnerships ?? []) {
    if (partnership.status === "divorced") continue;
    const [left, right] = partnership.personIds;
    if (!byId.has(left) || !byId.has(right)) continue;
    if (generations.get(left) !== generations.get(right)) continue;
    sets.union(left, right);
  }

  const grouped = new Map<string, FamilyPerson[]>();
  for (const person of graph.people) {
    const key = sets.find(person.id);
    const members = grouped.get(key) ?? [];
    members.push(person);
    grouped.set(key, members);
  }
  const personHousehold = new Map<string, string>();
  for (const [key, members] of grouped) for (const member of members) personHousehold.set(member.id, key);

  const childKeysByParent = new Map<string, Set<string>>();
  const households = [...grouped.entries()].map(([key, members]) => {
    const generation = Math.min(...members.map((member) => generations.get(member.id) ?? 0));
    const parentKeys = new Set<string>();
    for (const member of members) {
      for (const parentId of member.parentIds ?? []) {
        const parentKey = personHousehold.get(parentId);
        if (!parentKey || parentKey === key) continue;
        parentKeys.add(parentKey);
        const children = childKeysByParent.get(parentKey) ?? new Set<string>();
        children.add(key);
        childKeysByParent.set(parentKey, children);
      }
    }
    return {
      key,
      members,
      generation,
      width: members.length * config.cardWidth + Math.max(0, members.length - 1) * config.partnerGap,
      sourceOrder: Math.min(...members.map((member) => graph.people.findIndex((candidate) => candidate.id === member.id))),
      parentKeys: [...parentKeys],
      childKeys: [] as string[],
    };
  });
  return {
    households: households.map((household) => ({
      ...household,
      childKeys: [...(childKeysByParent.get(household.key) ?? [])],
    })),
    personHousehold,
  };
}

function orderedRows(households: readonly Household[]): readonly (readonly Household[])[] {
  const byGeneration = new Map<number, Household[]>();
  for (const household of households) {
    const row = byGeneration.get(household.generation) ?? [];
    row.push(household);
    byGeneration.set(household.generation, row);
  }
  return [...byGeneration.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, row]) => row.sort((left, right) => left.sourceOrder - right.sourceOrder));
}

function average(values: readonly number[]): number | undefined {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

export function layoutFamilyGraph(graph: FamilyGraph, options: LayoutOptions = {}): FamilyLayout {
  const config = { ...DEFAULTS, ...options };
  if (graph.people.length === 0) {
    return { nodes: [], edges: [], width: config.padding * 2, height: config.padding * 2, generations: [] };
  }

  const { households, personHousehold } = createHouseholds(graph, config);
  const rows = orderedRows(households);
  const leftByHousehold = new Map<string, number>();
  for (const row of rows) {
    let left = 0;
    for (const household of row) {
      leftByHousehold.set(household.key, left);
      left += household.width + config.householdGap;
    }
  }
  const byKey = new Map(households.map((household) => [household.key, household]));
  const center = (key: string): number | undefined => {
    const left = leftByHousehold.get(key);
    const household = byKey.get(key);
    return left === undefined || !household ? undefined : left + household.width / 2;
  };

  for (let pass = 0; pass < 6; pass += 1) {
    const traversal = pass % 2 === 0 ? rows : [...rows].reverse();
    for (const row of traversal) {
      const items = row.map((household) => {
        const relatives = pass % 2 === 0 ? household.parentKeys : household.childKeys;
        const relativeCenters = relatives.map(center).filter((value): value is number => value !== undefined);
        const current = center(household.key) ?? 0;
        const desiredCenter = average(relativeCenters) ?? current;
        return {
          width: household.width,
          desiredLeft: desiredCenter - household.width / 2,
          weight: relativeCenters.length > 0 ? relativeCenters.length : 0.15,
        };
      });
      const positions = solveLayoutRow(items, config.householdGap);
      row.forEach((household, index) => leftByHousehold.set(household.key, positions[index] ?? 0));
    }
  }

  const minLeft = Math.min(...leftByHousehold.values());
  const shiftX = config.padding - minLeft;
  const generations = rows.map((row) => row[0]?.generation).filter((value): value is number => value !== undefined);
  const rowIndexByGeneration = new Map(generations.map((generation, index) => [generation, index]));
  const nodes: LayoutNode[] = [];
  for (const household of households) {
    const householdLeft = (leftByHousehold.get(household.key) ?? 0) + shiftX;
    const y = config.padding + (rowIndexByGeneration.get(household.generation) ?? 0) * (config.cardHeight + config.rowGap);
    household.members.forEach((person, index) => {
      nodes.push({
        id: person.id,
        x: householdLeft + index * (config.cardWidth + config.partnerGap),
        y,
        width: config.cardWidth,
        height: config.cardHeight,
        generation: household.generation,
        householdKey: household.key,
      });
    });
  }

  const edges: LayoutEdge[] = [];
  const edgeKeys = new Set<string>();
  for (const person of graph.people) {
    for (const parentId of person.parentIds ?? []) {
      if (!personHousehold.has(parentId)) continue;
      const key = `parent-child\u0000${parentId}\u0000${person.id}`;
      if (!edgeKeys.has(key)) edges.push({ kind: "parent-child", fromId: parentId, toId: person.id });
      edgeKeys.add(key);
    }
  }
  for (const partnership of graph.partnerships ?? []) {
    if (partnership.status === "divorced") continue;
    const [left, right] = partnership.personIds;
    if (!personHousehold.has(left) || !personHousehold.has(right)) continue;
    const key = `partnership\u0000${[left, right].sort().join("\u0000")}`;
    if (!edgeKeys.has(key)) edges.push({ kind: "partnership", fromId: left, toId: right });
    edgeKeys.add(key);
  }

  const width = Math.max(...nodes.map((node) => node.x + node.width)) + config.padding;
  const height = Math.max(...nodes.map((node) => node.y + node.height)) + config.padding;
  return { nodes, edges, width, height, generations };
}

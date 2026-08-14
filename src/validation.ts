import type {
  FamilyGraph,
  FamilyPerson,
  ValidationIssue,
  ValidationOptions,
} from "./types.js";

const DEFAULTS: Required<ValidationOptions> = {
  maxParents: 2,
  maxCurrentPartners: 1,
  requireAdjacentGenerations: true,
};

function dateIsValid(person: FamilyPerson): boolean {
  const date = person.birthDate;
  if (!date) return true;
  if (!Number.isInteger(date.year)) return false;
  if (date.month !== undefined && (!Number.isInteger(date.month) || date.month < 1 || date.month > 12)) return false;
  if (date.day !== undefined) {
    if (date.month === undefined || !Number.isInteger(date.day) || date.day < 1) return false;
    const lastDay = new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
    if (date.day > lastDay) return false;
  }
  return true;
}

function pairKey(ids: readonly string[]): string {
  return [...ids].sort().join("\u0000");
}

function cyclePath(people: readonly FamilyPerson[], byId: ReadonlyMap<string, FamilyPerson>): readonly string[] | undefined {
  const state = new Map<string, "visiting" | "visited">();

  for (const person of people) {
    if (state.has(person.id)) continue;
    const stack: Array<{ id: string; nextParent: number }> = [{ id: person.id, nextParent: 0 }];
    const stackIndex = new Map<string, number>();

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      if (!current) break;
      if (!state.has(current.id)) {
        state.set(current.id, "visiting");
        stackIndex.set(current.id, stack.length - 1);
      }

      const parents = byId.get(current.id)?.parentIds ?? [];
      const parentId = parents[current.nextParent];
      if (parentId === undefined) {
        state.set(current.id, "visited");
        stackIndex.delete(current.id);
        stack.pop();
        continue;
      }

      current.nextParent += 1;
      if (!byId.has(parentId) || state.get(parentId) === "visited") continue;
      const existing = stackIndex.get(parentId);
      if (existing !== undefined) {
        return [...stack.slice(existing).map((entry) => entry.id), parentId];
      }
      stack.push({ id: parentId, nextParent: 0 });
    }
  }
  return undefined;
}

export function validateFamilyGraph(
  graph: FamilyGraph,
  options: ValidationOptions = {},
): readonly ValidationIssue[] {
  const config = { ...DEFAULTS, ...options };
  const issues: ValidationIssue[] = [];
  const byId = new Map<string, FamilyPerson>();

  for (const person of graph.people) {
    const id = person.id.trim();
    if (!id) {
      issues.push({ code: "empty-person-id", message: "Person IDs must not be empty." });
      continue;
    }
    if (byId.has(id)) {
      issues.push({ code: "duplicate-person-id", message: `Person ID '${id}' is duplicated.`, personId: id });
      continue;
    }
    byId.set(id, person);
    if (!dateIsValid(person)) {
      issues.push({ code: "invalid-date", message: `Person '${id}' has an invalid birth date.`, personId: id });
    }
  }

  for (const person of byId.values()) {
    const parentIds = person.parentIds ?? [];
    if (parentIds.length > config.maxParents) {
      issues.push({
        code: "too-many-parents",
        message: `Person '${person.id}' has more than ${config.maxParents} parents.`,
        personId: person.id,
      });
    }
    const seen = new Set<string>();
    for (const parentId of parentIds) {
      if (parentId === person.id) {
        issues.push({ code: "self-parent", message: `Person '${person.id}' cannot be their own parent.`, personId: person.id });
      }
      if (seen.has(parentId)) {
        issues.push({ code: "duplicate-parent", message: `Parent '${parentId}' is repeated for '${person.id}'.`, personId: person.id });
      }
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) {
        issues.push({ code: "unknown-parent", message: `Parent '${parentId}' does not exist.`, personId: person.id });
        continue;
      }
      if (
        config.requireAdjacentGenerations
        && person.generation !== undefined
        && parent.generation !== undefined
        && parent.generation !== person.generation - 1
      ) {
        issues.push({
          code: "generation-mismatch",
          message: `Parent '${parentId}' must be exactly one generation above '${person.id}'.`,
          personId: person.id,
        });
      }
    }
  }

  const cycle = cyclePath([...byId.values()], byId);
  if (cycle) {
    issues.push({ code: "ancestry-cycle", message: `Ancestry cycle detected: ${cycle.join(" -> ")}.`, path: cycle });
  }

  const partnershipIds = new Set<string>();
  const pairs = new Set<string>();
  const currentPartnerCounts = new Map<string, number>();
  for (const [index, partnership] of (graph.partnerships ?? []).entries()) {
    const partnershipId = partnership.id?.trim() || `#${index + 1}`;
    if (partnership.id) {
      if (partnershipIds.has(partnership.id)) {
        issues.push({
          code: "duplicate-partnership-id",
          message: `Partnership ID '${partnership.id}' is duplicated.`,
          partnershipId: partnership.id,
        });
      }
      partnershipIds.add(partnership.id);
    }
    const [left, right] = partnership.personIds;
    if (left === right) {
      issues.push({ code: "self-partnership", message: "A partnership must contain two different people.", partnershipId });
    }
    for (const personId of [left, right]) {
      if (!byId.has(personId)) {
        issues.push({ code: "unknown-partner", message: `Partner '${personId}' does not exist.`, partnershipId });
      }
    }
    const key = pairKey(partnership.personIds);
    if (pairs.has(key)) {
      issues.push({ code: "duplicate-partnership", message: `Partnership '${left}' / '${right}' is duplicated.`, partnershipId });
    }
    pairs.add(key);

    if (partnership.status === "current") {
      for (const personId of [left, right]) {
        const count = (currentPartnerCounts.get(personId) ?? 0) + 1;
        currentPartnerCounts.set(personId, count);
        if (count > config.maxCurrentPartners) {
          issues.push({
            code: "too-many-current-partners",
            message: `Person '${personId}' exceeds the configured current-partner limit.`,
            personId,
            partnershipId,
          });
        }
      }
    }
  }

  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}\u0000${issue.personId ?? ""}\u0000${issue.partnershipId ?? ""}\u0000${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function assertValidFamilyGraph(graph: FamilyGraph, options?: ValidationOptions): void {
  const issues = validateFamilyGraph(graph, options);
  if (issues.length > 0) {
    throw new TypeError(issues.map((issue) => `[${issue.code}] ${issue.message}`).join("\n"));
  }
}

export type PersonSex = "male" | "female" | "other" | "unknown";

export type PartialDate = {
  year: number;
  month?: number;
  day?: number;
};

export type FamilyPerson = {
  id: string;
  label?: string;
  parentIds?: readonly string[];
  sex?: PersonSex;
  birthDate?: PartialDate;
  generation?: number;
  householdId?: string;
};

export type PartnershipStatus = "current" | "divorced" | "bereaved";

export type FamilyPartnership = {
  id?: string;
  personIds: readonly [string, string];
  status: PartnershipStatus;
};

export type FamilyGraph = {
  people: readonly FamilyPerson[];
  partnerships?: readonly FamilyPartnership[];
};

export type Locale = "en" | "ja";

export type ValidationIssueCode =
  | "duplicate-person-id"
  | "empty-person-id"
  | "unknown-parent"
  | "duplicate-parent"
  | "self-parent"
  | "too-many-parents"
  | "generation-mismatch"
  | "ancestry-cycle"
  | "duplicate-partnership-id"
  | "unknown-partner"
  | "self-partnership"
  | "duplicate-partnership"
  | "too-many-current-partners"
  | "invalid-date";

export type ValidationIssue = {
  code: ValidationIssueCode;
  message: string;
  personId?: string;
  partnershipId?: string;
  path?: readonly string[];
};

export type ValidationOptions = {
  maxParents?: number;
  maxCurrentPartners?: number;
  requireAdjacentGenerations?: boolean;
};

export type RelationshipKind =
  | "self"
  | "ancestor"
  | "descendant"
  | "sibling"
  | "aunt-uncle"
  | "niece-nephew"
  | "cousin"
  | "spouse"
  | "relative-spouse"
  | "spouse-relative"
  | "unrelated";

export type Relationship = {
  kind: RelationshipKind;
  label: string;
  fromId: string;
  toId: string;
  up: number;
  down: number;
  commonAncestorId?: string;
  cousinDegree?: number;
  removed?: number;
  viaId?: string;
};

export type LayoutOptions = {
  cardWidth?: number;
  cardHeight?: number;
  partnerGap?: number;
  householdGap?: number;
  rowGap?: number;
  padding?: number;
};

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  householdKey: string;
};

export type LayoutEdge = {
  kind: "parent-child" | "partnership";
  fromId: string;
  toId: string;
};

export type FamilyLayout = {
  nodes: readonly LayoutNode[];
  edges: readonly LayoutEdge[];
  width: number;
  height: number;
  generations: readonly number[];
};

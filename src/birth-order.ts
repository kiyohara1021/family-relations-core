import type { FamilyPerson, Locale } from "./types.js";

export type BirthOrder = {
  rank: number;
  label: string;
  siblingIds: readonly string[];
};

function parentKey(person: FamilyPerson): string | undefined {
  if (!person.parentIds?.length) return undefined;
  return [...person.parentIds].sort().join("\u0000");
}

function birthKey(person: FamilyPerson): number | undefined {
  const date = person.birthDate;
  return date ? date.year * 10_000 + (date.month ?? 1) * 100 + (date.day ?? 1) : undefined;
}

function japaneseLabel(person: FamilyPerson, rank: number): string {
  const male = ["長男", "次男", "三男", "四男", "五男", "六男", "七男", "八男", "九男", "十男"];
  const female = ["長女", "次女", "三女", "四女", "五女", "六女", "七女", "八女", "九女", "十女"];
  if (person.sex === "male") return male[rank - 1] ?? `第${rank}男`;
  if (person.sex === "female") return female[rank - 1] ?? `第${rank}女`;
  return `第${rank}子`;
}

function englishOrdinal(rank: number): string {
  const mod100 = rank % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : rank % 10 === 1
      ? "st"
      : rank % 10 === 2
        ? "nd"
        : rank % 10 === 3
          ? "rd"
          : "th";
  return `${rank}${suffix}`;
}

function englishLabel(person: FamilyPerson, rank: number): string {
  const noun = person.sex === "male" ? "son" : person.sex === "female" ? "daughter" : "child";
  if (rank === 1) return `eldest ${noun}`;
  if (rank === 2) return `second ${noun}`;
  return `${englishOrdinal(rank)} ${noun}`;
}

export function getBirthOrder(
  personId: string,
  people: readonly FamilyPerson[],
  options: { locale?: Locale; sameSexOnly?: boolean } = {},
): BirthOrder | undefined {
  const person = people.find((candidate) => candidate.id === personId);
  const key = person && parentKey(person);
  if (!person || !key) return undefined;
  const sameSexOnly = options.sameSexOnly ?? true;
  if (sameSexOnly && (!person.sex || person.sex === "unknown" || person.sex === "other")) return undefined;

  const siblings = people
    .filter((candidate) => parentKey(candidate) === key && (!sameSexOnly || candidate.sex === person.sex))
    .sort((left, right) => {
      const leftBirth = birthKey(left) ?? Number.POSITIVE_INFINITY;
      const rightBirth = birthKey(right) ?? Number.POSITIVE_INFINITY;
      return leftBirth - rightBirth || left.id.localeCompare(right.id);
    });
  const index = siblings.findIndex((candidate) => candidate.id === personId);
  if (index < 0) return undefined;
  const rank = index + 1;
  return {
    rank,
    label: options.locale === "en" ? englishLabel(person, rank) : japaneseLabel(person, rank),
    siblingIds: siblings.map((candidate) => candidate.id),
  };
}

/** `1st`, `2nd`, `11th`, `21st`, `112th`: English ordinals with the 11–13 exception. */
export function englishOrdinal(rank: number): string {
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

/** Helpers for validating Chihiros auto schedules. */

import { WeekdaySelect } from './weekday';

export const SCHEDULE_WEEKDAYS: readonly WeekdaySelect[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export interface DuplicateScheduleWeekdays {
  readonly firstIndex: number;
  readonly secondIndex: number;
  readonly weekdays: readonly WeekdaySelect[];
}

/** Expand an optional selection into concrete weekdays (empty/everyday → all). */
export function normalizeScheduleWeekdays(
  selection: readonly WeekdaySelect[] | undefined,
): ReadonlySet<WeekdaySelect> {
  const selected = new Set(selection ?? []);
  if (selected.size === 0 || selected.has('everyday')) {
    return new Set(SCHEDULE_WEEKDAYS);
  }
  return selected;
}

/** Return the first pair of periods that target any of the same weekdays. */
export function findDuplicateScheduleWeekdays(
  periodWeekdays: readonly (readonly WeekdaySelect[] | undefined)[],
): DuplicateScheduleWeekdays | undefined {
  const normalized = periodWeekdays.map((w) => normalizeScheduleWeekdays(w));
  for (let i = 0; i < normalized.length; i++) {
    const w1 = normalized[i]!;
    for (let j = i + 1; j < normalized.length; j++) {
      const w2 = normalized[j]!;
      const duplicates = SCHEDULE_WEEKDAYS.filter((d) => w1.has(d) && w2.has(d));
      if (duplicates.length > 0) {
        return { firstIndex: i, secondIndex: j, weekdays: duplicates };
      }
    }
  }
  return undefined;
}

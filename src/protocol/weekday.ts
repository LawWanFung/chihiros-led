/** Weekday selection encoding for auto-schedule commands. */

export type WeekdaySelect =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'everyday';

const WEEKDAY_BITS: Readonly<Record<WeekdaySelect, number>> = {
  monday: 64,
  tuesday: 32,
  wednesday: 16,
  thursday: 8,
  friday: 4,
  saturday: 2,
  sunday: 1,
  everyday: 0,
};

/** Encode a list of selected weekdays into a bitmask. `everyday` → 127. */
export function encodeSelectedWeekdays(selection: readonly WeekdaySelect[]): number {
  if (selection.includes('everyday')) {
    return 127;
  }
  return selection.reduce((sum, day) => sum + (WEEKDAY_BITS[day] ?? 0), 0);
}

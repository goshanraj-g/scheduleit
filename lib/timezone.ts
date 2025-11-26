/**
 * Timezone conversion utilities
 * Allows participants to view and select times in their local timezone
 */

/**
 * Get the visitor's local timezone
 */
export function getVisitorTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Get timezone offset in minutes for a specific date and timezone
 * Handles DST automatically by using a specific date
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

/**
 * Convert a time from one timezone to another
 */
export function convertTime(
  date: Date,
  hour: number,
  minute: number = 0,
  fromTimezone: string,
  toTimezone: string
): { hour: number; minute: number; dayOffset: number } {
  if (fromTimezone === toTimezone) {
    return { hour, minute, dayOffset: 0 };
  }

  const sourceDate = new Date(date);
  sourceDate.setHours(hour, minute, 0, 0);
  
  const fromOffset = getTimezoneOffset(sourceDate, fromTimezone);
  const toOffset = getTimezoneOffset(sourceDate, toTimezone);
  const diffMinutes = toOffset - fromOffset;
  
  let totalMinutes = hour * 60 + minute + diffMinutes;
  let dayOffset = 0;
  
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
    dayOffset = -1;
  } else if (totalMinutes >= 24 * 60) {
    totalMinutes -= 24 * 60;
    dayOffset = 1;
  }
  
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
    dayOffset,
  };
}

/**
 * Convert start and end hours from event timezone to visitor timezone
 * Note: This simplifies display by keeping times on the same day
 */
export function convertEventHours(
  referenceDate: Date,
  startHour: number,
  endHour: number,
  eventTimezone: string,
  visitorTimezone: string
): { startHour: number; endHour: number; dayOffset: number } {
  const startConverted = convertTime(referenceDate, startHour, 0, eventTimezone, visitorTimezone);
  const endConverted = convertTime(referenceDate, endHour, 0, eventTimezone, visitorTimezone);
  
  let newStartHour = startConverted.hour;
  let newEndHour = endConverted.hour;
  const dayOffset = startConverted.dayOffset;
  
  // If start and end have different day offsets, the event spans midnight
  // In this case, we need to handle carefully
  if (startConverted.dayOffset !== endConverted.dayOffset) {
    // End time wrapped to next day, so add 24 for proper comparison
    if (endConverted.dayOffset > startConverted.dayOffset) {
      newEndHour = endConverted.hour + 24;
    } else {
      newStartHour = startConverted.hour + 24;
    }
  }
  
  // Ensure end > start (swap if needed due to conversion quirks)
  if (newEndHour <= newStartHour) {
    // Keep original duration
    const originalDuration = endHour - startHour;
    newEndHour = newStartHour + originalDuration;
  }
  
  // Cap end hour at 24 for display purposes
  if (newEndHour > 24) {
    newEndHour = 24;
  }
  
  return {
    startHour: newStartHour,
    endHour: newEndHour,
    dayOffset,
  };
}

/**
 * Convert a slot key from one timezone to another
 * Slot key format: "yyyy-MM-ddTHH:mm"
 */
export function convertSlotKey(
  slotKey: string,
  fromTimezone: string,
  toTimezone: string
): string {
  if (fromTimezone === toTimezone) return slotKey;
  
  const [datePart, timePart] = slotKey.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  
  const date = new Date(year, month - 1, day, hour, minute);
  const converted = convertTime(date, hour, minute, fromTimezone, toTimezone);
  
  const newDate = new Date(year, month - 1, day + converted.dayOffset);
  const newDatePart = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`;
  const newTimePart = `${String(converted.hour).padStart(2, "0")}:${String(converted.minute).padStart(2, "0")}`;
  
  return `${newDatePart}T${newTimePart}`;
}

/**
 * Convert a set of slot keys from visitor timezone back to event timezone (for saving)
 */
export function convertSlotsToEventTimezone(
  slots: Set<string> | string[],
  eventTimezone: string,
  visitorTimezone: string
): Set<string> {
  const slotsArray = slots instanceof Set ? Array.from(slots) : slots;
  return new Set(
    slotsArray.map(slot => convertSlotKey(slot, visitorTimezone, eventTimezone))
  );
}

/**
 * Convert a set of slot keys from event timezone to visitor timezone (for loading)
 */
export function convertSlotsToVisitorTimezone(
  slots: Set<string> | string[],
  eventTimezone: string,
  visitorTimezone: string
): Set<string> {
  const slotsArray = slots instanceof Set ? Array.from(slots) : slots;
  return new Set(
    slotsArray.map(slot => convertSlotKey(slot, eventTimezone, visitorTimezone))
  );
}

/**
 * Convert group availability from event timezone to visitor timezone
 */
export function convertGroupAvailabilityToVisitorTimezone(
  groupAvailability: { slots: { [slotKey: string]: { count: number; participants: string[] } } },
  eventTimezone: string,
  visitorTimezone: string
): { slots: { [slotKey: string]: { count: number; participants: string[] } } } {
  if (eventTimezone === visitorTimezone) return groupAvailability;
  
  const converted: { [slotKey: string]: { count: number; participants: string[] } } = {};
  
  Object.entries(groupAvailability.slots).forEach(([slotKey, data]) => {
    const newKey = convertSlotKey(slotKey, eventTimezone, visitorTimezone);
    if (converted[newKey]) {
      const existing = converted[newKey];
      const mergedParticipants = [...new Set([...existing.participants, ...data.participants])];
      converted[newKey] = {
        count: mergedParticipants.length,
        participants: mergedParticipants,
      };
    } else {
      converted[newKey] = { ...data };
    }
  });
  
  return { slots: converted };
}

/**
 * Check if two timezones are effectively the same (same offset at current time)
 */
export function timezonesMatch(tz1: string, tz2: string): boolean {
  if (tz1 === tz2) return true;
  const now = new Date();
  return getTimezoneOffset(now, tz1) === getTimezoneOffset(now, tz2);
}

/**
 * Get a short timezone label
 */
export function getTimezoneLabel(timezone: string): string {
  const parts = timezone.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { format as dateFnsFormat } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts string, number, Date, or Firestore Timestamp to epoch milliseconds
 */
export function toTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return new Date(val).getTime() || 0;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return 0;
}

/**
 * Safely compares two date/timestamp values for sorting.
 * Defaults to descending (newest first).
 */
export function compareDates(a: any, b: any, desc: boolean = true): number {
  const tA = toTimestampMs(a);
  const tB = toTimestampMs(b);
  return desc ? tB - tA : tA - tB;
}

/**
 * Safely formats a date or Firestore Timestamp without throwing RangeError
 */
export function safeFormatDate(val: any, formatStr: string = "MMM d, yyyy"): string {
  const ms = toTimestampMs(val);
  if (!ms) return "";
  try {
    return dateFnsFormat(new Date(ms), formatStr);
  } catch {
    return "";
  }
}

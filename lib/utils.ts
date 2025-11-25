import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize user-provided names:
 * - Trim whitespace
 * - Limit to 50 characters
 * - Remove control characters and zero-width chars
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    // Remove control characters and zero-width characters
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .slice(0, 50);
}

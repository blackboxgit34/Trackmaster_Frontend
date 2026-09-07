import { format, parse, parseISO } from 'date-fns';

/**
 * Normalizes input date/time to a Date instance.
 */
export function toValidDate(dateInput: Date | string | number): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  if (typeof dateInput === 'string') {
    // Try parseISO first
    const isoDate = parseISO(dateInput);
    if (!isNaN(isoDate.getTime())) return isoDate;

    // Try parsing standard formats like 'yyyy-MM-dd hh:mm:ss a' or 'yyyy-MM-dd HH:mm:ss'
    try {
      const parsed12 = parse(dateInput, 'yyyy-MM-dd hh:mm:ss a', new Date());
      if (!isNaN(parsed12.getTime())) return parsed12;

      const parsed24 = parse(dateInput, 'yyyy-MM-dd HH:mm:ss', new Date());
      if (!isNaN(parsed24.getTime())) return parsed24;
    } catch {
      // Fallback to native Date constructor
    }
  }

  const fallback = new Date(dateInput);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

/**
 * Formats date into standard Trackmaster UI date format: '11 Aug 2026' (dd MMM yyyy).
 */
export function formatAppDate(dateInput: Date | string | number): string {
  const d = toValidDate(dateInput);
  return format(d, 'dd MMM yyyy');
}

/**
 * Formats time according to user setting:
 * - '12h': '02:30 PM'
 * - '24h': '14:30'
 */
export function formatAppTime(
  dateInput: Date | string | number,
  timeFormat: '12h' | '24h' = '12h'
): string {
  const d = toValidDate(dateInput);
  return timeFormat === '24h' ? format(d, 'HH:mm') : format(d, 'hh:mm a');
}

/**
 * Formats combined date and time according to user setting:
 * - '12h': '11 Aug 2026, 02:30 PM'
 * - '24h': '11 Aug 2026, 14:30'
 */
export function formatAppDateTime(
  dateInput: Date | string | number,
  timeFormat: '12h' | '24h' = '12h'
): string {
  const dateStr = formatAppDate(dateInput);
  const timeStr = formatAppTime(dateInput, timeFormat);
  return `${dateStr}, ${timeStr}`;
}

/**
 * Formats duration in seconds into 'x day/days x h/hrs x min' format.
 * Examples:
 * - 90000s -> '1 day 1 h 0 min'
 * - 172800s -> '2 days 0 hrs 0 min'
 * - 9900s -> '2 hrs 45 min'
 * - 180s -> '3 min'
 */
export function formatAppDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0 min';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    parts.push(`${hours} ${hours === 1 ? 'h' : 'hrs'}`);
    parts.push(`${mins} min`);
  } else if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'h' : 'hrs'}`);
    parts.push(`${mins} min`);
  } else {
    parts.push(`${mins} min`);
  }

  return parts.join(' ');
}

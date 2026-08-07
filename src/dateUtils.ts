import { DateFormat } from '../types';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format a date string or Date object into the chosen DateFormat.
 * Default format: 'DD/MM/YYYY'
 */
export const formatDateDisplay = (
  dateInput?: string | Date | null,
  format: DateFormat = 'DD/MM/YYYY'
): string => {
  if (!dateInput) return '';

  let year = '';
  let month = ''; // 01-12
  let day = '';   // 01-31
  let monthIndex = 0;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';

    // If string starts with YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.slice(0, 10).split('-');
      year = parts[0];
      month = parts[1];
      day = parts[2];
      monthIndex = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
      // DD/MM/YYYY
      const parts = trimmed.split('/');
      day = parts[0];
      month = parts[1];
      year = parts[2];
      monthIndex = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
    } else if (/^\d{2}-\d{2}-\d{4}/.test(trimmed)) {
      // DD-MM-YYYY
      const parts = trimmed.split('-');
      day = parts[0];
      month = parts[1];
      year = parts[2];
      monthIndex = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
    } else {
      // Fallback: parse with Date
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return trimmed;
      year = String(d.getFullYear());
      month = String(d.getMonth() + 1).padStart(2, '0');
      day = String(d.getDate()).padStart(2, '0');
      monthIndex = d.getMonth();
    }
  } else if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    year = String(dateInput.getFullYear());
    month = String(dateInput.getMonth() + 1).padStart(2, '0');
    day = String(dateInput.getDate()).padStart(2, '0');
    monthIndex = dateInput.getMonth();
  } else {
    return '';
  }

  const monthMMM = MONTH_NAMES_SHORT[monthIndex] || month;

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD-MMM-YYYY':
      return `${day}-${monthMMM}-${year}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${year}`;
  }
};

/**
 * Helper to add N calendar days to a YYYY-MM-DD date string safely.
 */
export const addDaysToDate = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.slice(0, 10);
  const parts = trimmed.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const dateObj = new Date(year, month - 1, day);
  dateObj.setDate(dateObj.getDate() + days);

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
};

/**
 * Calculates expiry date based strictly on 30 calendar days including the start/joining date (+29 days for 1 month).
 * Example: Joined on 1st (e.g. 2026-08-01) -> 30th day is 30th (2026-08-30).
 */
export const calculate30DaysExpiry = (startDateStr: string, monthsDuration: number = 1): string => {
  if (!startDateStr) return '';
  const totalActiveDays = 30 * (monthsDuration > 0 ? monthsDuration : 1);
  return addDaysToDate(startDateStr, totalActiveDays - 1);
};

/**
 * Get the next day after a given YYYY-MM-DD date.
 * Used for renewal: new plan starts on the very next day after expiry.
 */
export const getNextDay = (dateStr: string): string => {
  return addDaysToDate(dateStr, 1);
};

/**
 * Checks if today is the 30th day (Expiry Date).
 */
export const isExpiringToday = (expiryDate?: string): boolean => {
  if (!expiryDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today === expiryDate.slice(0, 10);
};

/**
 * Checks if 30 days are complete and past expiry date (current date > Expiry Date).
 */
export const isMemberExpired = (expiryDate?: string): boolean => {
  if (!expiryDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today > expiryDate.slice(0, 10);
};

export type ExpiryStatus = 'active' | 'expiring_today' | 'expired';

export const getExpiryStatus = (expiryDate?: string): ExpiryStatus => {
  if (!expiryDate) return 'active';
  const today = new Date().toISOString().slice(0, 10);
  const exp = expiryDate.slice(0, 10);
  if (today > exp) return 'expired';
  if (today === exp) return 'expiring_today';
  return 'active';
};


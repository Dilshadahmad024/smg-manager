/**
 * Theme & Accent Styling Manager for SMG Manager
 */

import { ThemeColor } from '../types';

export interface ThemeClasses {
  bgPrimary: string;
  bgLight: string;
  textPrimary: string;
  borderPrimary: string;
  hoverPrimary: string;
  badgeBg: string;
  badgeText: string;
  ringFocus: string;
  gradientFrom: string;
  gradientTo: string;
}

export const themeMap: Record<ThemeColor, ThemeClasses> = {
  emerald: {
    bgPrimary: 'bg-emerald-600',
    bgLight: 'bg-emerald-50',
    textPrimary: 'text-emerald-600',
    borderPrimary: 'border-emerald-600',
    hoverPrimary: 'hover:bg-emerald-700',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    ringFocus: 'focus:ring-emerald-500',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-teal-700',
  },
  blue: {
    bgPrimary: 'bg-blue-600',
    bgLight: 'bg-blue-50',
    textPrimary: 'text-blue-600',
    borderPrimary: 'border-blue-600',
    hoverPrimary: 'hover:bg-blue-700',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    ringFocus: 'focus:ring-blue-500',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-indigo-700',
  },
  crimson: {
    bgPrimary: 'bg-rose-600',
    bgLight: 'bg-rose-50',
    textPrimary: 'text-rose-600',
    borderPrimary: 'border-rose-600',
    hoverPrimary: 'hover:bg-rose-700',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    ringFocus: 'focus:ring-rose-500',
    gradientFrom: 'from-rose-600',
    gradientTo: 'to-red-700',
  },
  amber: {
    bgPrimary: 'bg-amber-600',
    bgLight: 'bg-amber-50',
    textPrimary: 'text-amber-600',
    borderPrimary: 'border-amber-600',
    hoverPrimary: 'hover:bg-amber-700',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    ringFocus: 'focus:ring-amber-500',
    gradientFrom: 'from-amber-600',
    gradientTo: 'to-yellow-700',
  },
  indigo: {
    bgPrimary: 'bg-indigo-600',
    bgLight: 'bg-indigo-50',
    textPrimary: 'text-indigo-600',
    borderPrimary: 'border-indigo-600',
    hoverPrimary: 'hover:bg-indigo-700',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    ringFocus: 'focus:ring-indigo-500',
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-purple-700',
  },
  slate: {
    bgPrimary: 'bg-slate-800',
    bgLight: 'bg-slate-100',
    textPrimary: 'text-slate-800',
    borderPrimary: 'border-slate-800',
    hoverPrimary: 'hover:bg-slate-900',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-900',
    ringFocus: 'focus:ring-slate-500',
    gradientFrom: 'from-slate-800',
    gradientTo: 'to-zinc-900',
  },
};

export function getTheme(color: ThemeColor = 'emerald'): ThemeClasses {
  return themeMap[color] || themeMap.emerald;
}

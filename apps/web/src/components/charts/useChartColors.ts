import { useEffect, useState } from 'react';
import { useTheme } from '@/components/layout/useTheme';

export interface ChartColors {
  primary: string;
  primaryFg: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  border: string;
  surface: string;
  fg: string;
  fgMuted: string;
}

const FALLBACK: ChartColors = {
  primary: '#0d9488',
  primaryFg: '#ffffff',
  accent: '#4f46e5',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',
  border: '#e3e7ee',
  surface: '#ffffff',
  fg: '#0f172a',
  fgMuted: '#5b6779',
};

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.length > 0 ? value : fallback;
}

function readColors(): ChartColors {
  return {
    primary: readCssVar('--color-primary', FALLBACK.primary),
    primaryFg: readCssVar('--color-primary-fg', FALLBACK.primaryFg),
    accent: readCssVar('--color-accent', FALLBACK.accent),
    success: readCssVar('--color-success', FALLBACK.success),
    warning: readCssVar('--color-warning', FALLBACK.warning),
    danger: readCssVar('--color-danger', FALLBACK.danger),
    info: readCssVar('--color-info', FALLBACK.info),
    border: readCssVar('--color-border', FALLBACK.border),
    surface: readCssVar('--color-surface', FALLBACK.surface),
    fg: readCssVar('--color-fg', FALLBACK.fg),
    fgMuted: readCssVar('--color-fg-muted', FALLBACK.fgMuted),
  };
}

/**
 * Reads the current theme's CSS variables so Recharts (which cannot consume
 * Tailwind classes directly) stays in sync when the user toggles dark mode.
 */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    // Read on next tick so the `.dark` class toggle (which happens in a
    // separate effect) has already applied to `documentElement`.
    const raf = requestAnimationFrame(() => setColors(readColors()));
    return () => cancelAnimationFrame(raf);
  }, [resolvedTheme]);

  return colors;
}

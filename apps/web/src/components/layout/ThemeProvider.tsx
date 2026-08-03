import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ThemeContext } from './ThemeContext';
import type { ResolvedTheme, Theme } from './ThemeContext';

const STORAGE_KEY = 'meditrack-theme';

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Light/dark/system theme, persisted to localStorage. `index.html` sets the
 * `.dark` class synchronously before hydration to avoid a flash of the wrong
 * theme; this provider keeps the class in sync with subsequent changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeStorage] = useLocalStorage<Theme>(STORAGE_KEY, 'system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    const next = resolveTheme(theme);
    setResolvedTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = resolveTheme('system');
      setResolvedTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeStorage(next), [setThemeStorage]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

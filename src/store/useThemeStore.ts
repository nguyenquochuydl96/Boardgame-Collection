import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppTheme = 'fitlo' | 'fitlo-dark';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  tagline: string;
  colors: {
    bg: string;
    surface: string;
    accent: string;
    secondary: string;
  };
  icon: string;
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    id: 'fitlo',
    name: 'Fitlo Nordic',
    tagline: 'Nordic spruce teal, warm stone & porcelain minimalist',
    colors: {
      bg: '#f7f6f2',
      surface: '#fdfdfb',
      accent: '#0b7a73',
      secondary: '#e2603a',
    },
    icon: '🌲',
  },
  {
    id: 'fitlo-dark',
    name: 'Fitlo Dark Pine',
    tagline: 'Deep obsidian pine & electric mint cyan glow',
    colors: {
      bg: '#111514',
      surface: '#191e1d',
      accent: '#3cc2b5',
      secondary: '#f08a5d',
    },
    icon: '🌿',
  },
];

interface ThemeStore {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

function applyThemeToDOM(theme: AppTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'fitlo-dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'fitlo',
      setTheme: (newTheme) => {
        applyThemeToDOM(newTheme);
        set({ theme: newTheme });
      },
      toggleTheme: () => {
        const current = get().theme;
        const next: AppTheme = current === 'fitlo' ? 'fitlo-dark' : 'fitlo';
        applyThemeToDOM(next);
        set({ theme: next });
      },
    }),
    {
      name: 'bg-vault-fitlo-theme-v4',
      onRehydrateStorage: () => (state) => {
        if (state && (state.theme === 'fitlo' || state.theme === 'fitlo-dark')) {
          applyThemeToDOM(state.theme);
        } else {
          applyThemeToDOM('fitlo');
        }
      },
    }
  )
);

// Apply on initial script evaluation
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('bg-vault-fitlo-theme-v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.theme === 'fitlo-dark') {
        applyThemeToDOM('fitlo-dark');
      } else {
        applyThemeToDOM('fitlo');
      }
    } else {
      applyThemeToDOM('fitlo');
    }
  } catch {
    applyThemeToDOM('fitlo');
  }
}

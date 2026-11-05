import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppTheme = 'fitlo' | 'fitlo-dark' | 'raye' | 'noir';

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
    tagline: 'Nordic spruce teal, warm stone & porcelain minimalist (codeandchill.store/templates/fitlo)',
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
  {
    id: 'raye',
    name: 'Rayé Signature',
    tagline: 'Warm cream, bold coral & vintage pine teal editorial',
    colors: {
      bg: '#fbf6ee',
      surface: '#fffdf8',
      accent: '#ff6b4a',
      secondary: '#0e4f4b',
    },
    icon: '☀️',
  },
  {
    id: 'noir',
    name: 'Rayé Noir',
    tagline: 'Deep charcoal velvet, sunset coral & warm butter',
    colors: {
      bg: '#14110e',
      surface: '#1f1a16',
      accent: '#ff6b4a',
      secondary: '#ffd66b',
    },
    icon: '🌙',
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
    if (theme === 'noir' || theme === 'fitlo-dark') {
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
      theme: 'fitlo', // Default to Fitlo Nordic!
      setTheme: (newTheme) => {
        applyThemeToDOM(newTheme);
        set({ theme: newTheme });
      },
      toggleTheme: () => {
        const current = get().theme;
        let next: AppTheme = 'fitlo';
        if (current === 'fitlo') next = 'fitlo-dark';
        else if (current === 'fitlo-dark') next = 'raye';
        else if (current === 'raye') next = 'noir';
        else next = 'fitlo';
        applyThemeToDOM(next);
        set({ theme: next });
      },
    }),
    {
      name: 'bg-vault-theme-pref-v3',
      onRehydrateStorage: () => (state) => {
        if (state) {
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
    const saved = localStorage.getItem('bg-vault-theme-pref-v3');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.theme) {
        applyThemeToDOM(parsed.state.theme);
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

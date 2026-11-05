import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppTheme = 'raye' | 'noir';

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
    id: 'raye',
    name: 'Rayé Signature',
    tagline: 'Warm cream, bold coral & vintage pine teal editorial (Default)',
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
    if (theme === 'noir') {
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
      theme: 'raye', // Default to Rayé Signature!
      setTheme: (newTheme) => {
        applyThemeToDOM(newTheme);
        set({ theme: newTheme });
      },
      toggleTheme: () => {
        const next = get().theme === 'raye' ? 'noir' : 'raye';
        applyThemeToDOM(next);
        set({ theme: next });
      },
    }),
    {
      name: 'bg-vault-theme-pref-v2',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme);
        } else {
          applyThemeToDOM('raye');
        }
      },
    }
  )
);

// Apply on initial script evaluation
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('bg-vault-theme-pref-v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.theme === 'noir' || parsed?.state?.theme === 'raye') {
        applyThemeToDOM(parsed.state.theme);
      } else {
        applyThemeToDOM('raye');
      }
    } else {
      applyThemeToDOM('raye');
    }
  } catch {
    applyThemeToDOM('raye');
  }
}

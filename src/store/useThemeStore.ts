import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppTheme = 'amber' | 'navy' | 'emerald' | 'light' | 'purple';

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
    id: 'amber',
    name: 'Warm Amber & Coffee',
    tagline: 'Ấm áp, gỗ mộc & cà phê cozy (Khuyên dùng)',
    colors: {
      bg: '#101216',
      surface: '#171920',
      accent: '#f97316',
      secondary: '#f59e0b',
    },
    icon: '🪵',
  },
  {
    id: 'navy',
    name: 'Slate Navy & Tangerine',
    tagline: 'Xanh hải quân thể thao & Cam rực rỡ',
    colors: {
      bg: '#071526',
      surface: '#0b1e36',
      accent: '#ff6b00',
      secondary: '#2563eb',
    },
    icon: '⚡',
  },
  {
    id: 'emerald',
    name: 'Midnight & Mint',
    tagline: 'Phong cách Apple / Linear tối giản sang trọng',
    colors: {
      bg: '#090d10',
      surface: '#10161c',
      accent: '#10b981',
      secondary: '#06b6d4',
    },
    icon: '✨',
  },
  {
    id: 'light',
    name: 'Warm Canvas & Terracotta',
    tagline: 'Giao diện sáng ấm, trang nhã ban ngày',
    colors: {
      bg: '#f8f6f0',
      surface: '#ffffff',
      accent: '#ea580c',
      secondary: '#d97706',
    },
    icon: '☀️',
  },
  {
    id: 'purple',
    name: 'Cyberpunk Violet',
    tagline: 'Tím neon & Xanh cyan nguyên bản',
    colors: {
      bg: '#0f0f1a',
      surface: '#16162a',
      accent: '#7c3aed',
      secondary: '#2563eb',
    },
    icon: '🌌',
  },
];

interface ThemeStore {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

function applyThemeToDOM(theme: AppTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'amber', // Default to the cozy Warm Amber theme!
      setTheme: (newTheme) => {
        applyThemeToDOM(newTheme);
        set({ theme: newTheme });
      },
    }),
    {
      name: 'bg-vault-theme-pref',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme);
        }
      },
    }
  )
);

// Apply on initial script evaluation
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('bg-vault-theme-pref');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.theme) {
        applyThemeToDOM(parsed.state.theme);
      } else {
        applyThemeToDOM('amber');
      }
    } else {
      applyThemeToDOM('amber');
    }
  } catch {
    applyThemeToDOM('amber');
  }
}

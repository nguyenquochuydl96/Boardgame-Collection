import React, { useState } from 'react';
import { Sheet, RefreshCw, Plus, Layers, GitCompare, BarChart3, Palette } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'cabinets' | 'compare' | 'stats' | 'sheet';
  setActiveTab: (tab: 'cabinets' | 'compare' | 'stats' | 'sheet') => void;
  onOpenSyncModal: () => void;
  onOpenAddModal: () => void;
  isSyncing: boolean;
  totalGames: number;
  realCount: number;
  fakeCount: number;
  sheetConnected: boolean;
  currentUser?: User | null;
  onSignInWithGoogle?: () => Promise<void>;
  currentTheme?: 'mahogany' | 'cyberpunk' | 'parchment';
  setTheme?: (theme: 'mahogany' | 'cyberpunk' | 'parchment') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSyncModal,
  onOpenAddModal,
  isSyncing,
  totalGames,
  realCount,
  fakeCount,
  sheetConnected,
  currentUser,
  onSignInWithGoogle,
  currentTheme = 'mahogany',
  setTheme,
}) => {
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-[#090b0e]/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4 xl:gap-6">
        {/* Logo & Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/40 border border-amber-400/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <button
            onClick={() => setActiveTab('cabinets')}
            className="text-left group"
          >
            <span className="text-lg md:text-xl font-bold tracking-tight text-white font-display block whitespace-nowrap">
              BoardGame Vault
            </span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 min-w-0">
          <button
            onClick={() => setActiveTab('cabinets')}
            className={`px-2.5 2xl:px-3.5 py-1.5 text-xs lg:text-[13px] 2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'cabinets'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden 2xl:inline">Dual Cabinets</span>
            <span className="2xl:hidden">Cabinets</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`px-2.5 2xl:px-3.5 py-1.5 text-xs lg:text-[13px] 2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span className="hidden 2xl:inline">Authenticity Compare</span>
            <span className="2xl:hidden">Compare</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-2.5 2xl:px-3.5 py-1.5 text-xs lg:text-[13px] 2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden 2xl:inline">Collection Analytics</span>
            <span className="2xl:hidden">Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-2.5 2xl:px-3.5 py-1.5 text-xs lg:text-[13px] 2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'sheet'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sheet className="w-4 h-4" />
            <span className="hidden 2xl:inline">Google Sheet Sync</span>
            <span className="2xl:hidden">Sheet</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {currentUser ? (
            <button
              onClick={onOpenSyncModal}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors text-xs text-slate-200"
              title={`Google connected: ${currentUser.email}`}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google'}
                  className="w-5 h-5 rounded-full border border-emerald-500/40"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-[10px] font-bold text-white flex items-center justify-center">
                  G
                </div>
              )}
              <span className="hidden sm:inline max-w-[100px] truncate text-[11px]">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
            </button>
          ) : onSignInWithGoogle ? (
            <button
              onClick={onSignInWithGoogle}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              aria-label="Sign in with Google"
              title="Connect Google Drive & Sheets"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="hidden 2xl:inline">Google Sign-in</span>
            </button>
          ) : null}

          {setTheme && (
            <div className="relative">
              <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                title="Change Shelf Theme"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline capitalize">{currentTheme}</span>
              </button>
              {showThemeDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                  <button
                    onClick={() => { setTheme('mahogany'); setShowThemeDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${currentTheme === 'mahogany' ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-300'}`}
                  >
                    <span>🌲 Mahogany & Brass</span>
                    {currentTheme === 'mahogany' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                  </button>
                  <button
                    onClick={() => { setTheme('cyberpunk'); setShowThemeDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${currentTheme === 'cyberpunk' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-300'}`}
                  >
                    <span>🌌 Cyberpunk Dark</span>
                    {currentTheme === 'cyberpunk' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                  </button>
                  <button
                    onClick={() => { setTheme('parchment'); setShowThemeDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${currentTheme === 'parchment' ? 'text-amber-200 font-bold bg-amber-200/10' : 'text-slate-300'}`}
                  >
                    <span>📜 Parchment & Ink</span>
                    {currentTheme === 'parchment' && <span className="w-1.5 h-1.5 rounded-full bg-amber-200"></span>}
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Game</span>
          </button>

          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-md shadow-amber-500/20 active:scale-95 transition-all whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around pt-2.5 mt-2 border-t border-slate-800/60 text-xs">
        <button
          onClick={() => setActiveTab('cabinets')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'cabinets' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cabinets</span>
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'compare' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>Compare</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'stats' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Stats</span>
        </button>
        <button
          onClick={() => setActiveTab('sheet')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'sheet' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Sheet className="w-4 h-4" />
          <span>Sheet</span>
        </button>
      </div>
    </header>
  );
};

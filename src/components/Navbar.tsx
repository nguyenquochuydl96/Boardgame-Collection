import React, { useState } from 'react';
import { Home, Sheet, Plus, Layers, GitCompare, BarChart3, Palette, RefreshCw, Smartphone, Dices, Trophy, Shield } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'overview' | 'cabinets' | 'plays' | 'compare' | 'stats' | 'sheet';
  setActiveTab: (tab: 'overview' | 'cabinets' | 'plays' | 'compare' | 'stats' | 'sheet') => void;
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
  onInstallPwa?: () => void;
  isInstallable?: boolean;
  onOpenGamePicker?: (tab?: 'recommend' | 'wheel') => void;
  onOpenSleeveManager?: () => void;
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
  onInstallPwa,
  isInstallable,
  onOpenGamePicker,
  onOpenSleeveManager,
}) => {
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#071526]/95 backdrop-blur-md border-b border-[#163558] px-4 md:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4 xl:gap-6">
        {/* Logo & Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] flex items-center justify-center shadow-lg shadow-[#FF6B00]/30 border border-[#FF9E4D]/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="text-left group"
          >
            <span className="text-lg md:text-xl font-bold tracking-tight text-white font-display block whitespace-nowrap group-hover:text-[#FF6B00] transition-colors">
              BoardGame Vault
            </span>
          </button>
        </div>

        {/* Navigation Tabs (Overview & Detailed Cabinets) */}
        <nav className="hidden md:flex items-center gap-1.5 min-w-0 bg-[#0B1E34] p-1 rounded-full border border-[#163558]">
          {/* 1. Overview Tab */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 text-xs lg:text-[13px] font-semibold rounded-full transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                : 'text-[#8EADC8] hover:text-white hover:bg-[#122A47]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Tổng Quan</span>
          </button>

          {/* 2. Detailed Cabinets Tab */}
          <button
            onClick={() => setActiveTab('cabinets')}
            className={`px-3.5 py-1.5 text-xs lg:text-[13px] font-semibold rounded-full transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'cabinets'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                : 'text-[#8EADC8] hover:text-white hover:bg-[#122A47]'
            }`}
          >
            <Layers className="w-4 h-4" />
<span className="hidden lg:inline">2 Kệ Game Chi Tiết</span><span className="lg:hidden">Kệ Game</span>
          </button>

          {/* 3. Nhật Ký Ván Chơi Tab */}
          <button
            onClick={() => setActiveTab('plays')}
            className={`px-3 py-1.5 text-xs lg:text-[13px] font-semibold rounded-full transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'plays'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                : 'text-[#8EADC8] hover:text-white hover:bg-[#122A47]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Nhật Ký Ván Chơi</span>
            <span className="xl:hidden">Nhật Ký</span>
          </button>

          {/* 3. Compare Tab */}
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3.5 py-1.5 text-xs lg:text-[13px] font-semibold rounded-full transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                : 'text-[#8EADC8] hover:text-white hover:bg-[#122A47]'
            }`}
          >
            <GitCompare className="w-4 h-4" />
<span className="hidden lg:inline">So Sánh Thật/Giả</span><span className="lg:hidden">So Sánh</span>
          </button>

          {/* 4. Analytics Tab */}
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-1.5 text-xs lg:text-[13px] font-semibold rounded-full transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                : 'text-[#8EADC8] hover:text-white hover:bg-[#122A47]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          {/* 5. Google Sheet Tab */}
          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-3.5 py-1.5 text-xs lg:text-[13px] font-semibold rounded-full transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'sheet'
                ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                : 'text-[#8EADC8] hover:text-white hover:bg-[#122A47]'
            }`}
          >
            <Sheet className="w-4 h-4" />
            <span>Google Sheet</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {currentUser ? (
            <button
              onClick={onOpenSyncModal}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-[#0E233C] hover:bg-[#142C4C] border border-[#163558] transition-colors text-xs text-[#8EADC8] hover:text-white"
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
              <span className="hidden sm:inline max-w-[100px] truncate text-[11px] font-semibold">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
            </button>
          ) : onSignInWithGoogle ? (
            <button
              onClick={onSignInWithGoogle}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#8EADC8] hover:text-white bg-[#0E233C] hover:bg-[#142C4C] border border-[#163558] rounded-full transition-colors whitespace-nowrap shrink-0"
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

          {onOpenGamePicker && (
            <button
              onClick={() => onOpenGamePicker('recommend')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-300 hover:text-white bg-gradient-to-r from-amber-500/15 to-[#FF6B00]/20 hover:from-[#FF6B00] hover:to-[#FF8C33] border border-amber-500/40 hover:border-[#FFA154] rounded-full transition-all shadow-sm shrink-0"
              title="Trợ lý Hôm Nay Chơi Gì & Vòng quay may mắn"
            >
              <Dices className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span className="hidden sm:inline">Hôm Nay Chơi Gì?</span>
            </button>
          )}

          {onOpenSleeveManager && (
            <button
              onClick={onOpenSleeveManager}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-600 border border-emerald-500/30 rounded-full transition-all shrink-0"
              title="Quản lý bọc bài (Sleeves) & Phụ kiện nâng cấp"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Bọc Bài</span>
            </button>
          )}

          {onInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#FF6B00] hover:text-white bg-[#FF6B00]/15 hover:bg-[#FF6B00] border border-[#FF6B00]/30 rounded-full transition-all whitespace-nowrap shrink-0"
              title="Cài đặt BoardGame Vault như ứng dụng độc lập trên điện thoại hoặc máy tính"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cài App</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0E233C] hover:bg-[#142C4C] border border-[#163558] rounded-full transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Thêm Game</span>
          </button>

          <button
            onClick={onOpenSyncModal}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#FF6B00] to-[#FF8C33] hover:from-[#FF7A1A] hover:to-[#FFA04D] rounded-full shadow-md shadow-[#FF6B00]/30 active:scale-95 transition-all whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

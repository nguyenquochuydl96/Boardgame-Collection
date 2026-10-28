import React from 'react';
import { Home, Layers, GitCompare, BarChart3, Sheet, Plus } from 'lucide-react';

interface BottomDockProps {
  activeTab: 'overview' | 'cabinets' | 'compare' | 'stats' | 'sheet';
  setActiveTab: (tab: 'overview' | 'cabinets' | 'compare' | 'stats' | 'sheet') => void;
  onOpenSyncModal: () => void;
  onOpenAddModal: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  setActiveTab,
  onOpenSyncModal,
  onOpenAddModal,
}) => {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] sm:w-auto">
      <nav className="bg-[#09182a]/95 backdrop-blur-xl border border-[#193a5e]/80 shadow-[0_12px_35px_rgba(0,0,0,0.7)] px-2 sm:px-3 py-2 rounded-full flex items-center justify-between sm:justify-center gap-1 sm:gap-2">
        {/* 1. Home / Tổng quan */}
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeTab === 'overview'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/40 scale-105'
              : 'text-[#8EADC8] hover:text-white hover:bg-[#122b4a]/60'
          }`}
          title="Màn hình tổng quan"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        {/* 2. Dual Cabinets / 2 Kệ Chi tiết */}
        <button
          onClick={() => setActiveTab('cabinets')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeTab === 'cabinets'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/40 scale-105'
              : 'text-[#8EADC8] hover:text-white hover:bg-[#122b4a]/60'
          }`}
          title="Kệ game chi tiết (Dual Shelves)"
        >
          <Layers className="w-4 h-4" />
          <span>Shelves</span>
        </button>

        {/* 3. Authenticity Compare */}
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeTab === 'compare'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/40 scale-105'
              : 'text-[#8EADC8] hover:text-white hover:bg-[#122b4a]/60'
          }`}
          title="So sánh thật / giả"
        >
          <GitCompare className="w-4 h-4" />
          <span className="hidden sm:inline">Compare</span>
        </button>

        {/* 4. Analytics / Stats */}
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeTab === 'stats'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/40 scale-105'
              : 'text-[#8EADC8] hover:text-white hover:bg-[#122b4a]/60'
          }`}
          title="Thống kê chuyên sâu"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Stats</span>
        </button>

        {/* 5. Google Sheet Config */}
        <button
          onClick={onOpenSyncModal}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeTab === 'sheet'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/40 scale-105'
              : 'text-[#8EADC8] hover:text-white hover:bg-[#122b4a]/60'
          }`}
          title="Google Sheet Sync & Settings"
        >
          <Sheet className="w-4 h-4" />
          <span className="hidden sm:inline">Sheet</span>
        </button>
      </nav>
    </div>
  );
};

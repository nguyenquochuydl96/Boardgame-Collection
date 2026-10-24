import React, { useState, useEffect } from 'react';
import { BoardGame, CabinetType } from './types/boardgame';
import { INITIAL_BOARDGAMES } from './data/defaultGames';
import { fetchFromGoogleSheet, SAMPLE_GOOGLE_SHEET_URL, USER_COLLECTION_SHEET_URL } from './services/googleSheets';
import { Navbar } from './components/Navbar';
import { CabinetsView } from './components/CabinetsView';
import { ComparisonMode } from './components/ComparisonMode';
import { StatsView } from './components/StatsView';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { GameDetailModal } from './components/GameDetailModal';
import { AddEditGameModal } from './components/AddEditGameModal';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import { User } from 'firebase/auth';
import {
  ShieldCheck,
  AlertTriangle,
  Sheet,
  RefreshCw,
  Plus,
  GitCompare,
  BarChart3,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

const STORAGE_KEY = 'boardgame_vault_games_v6';
const SHEET_URL_KEY = 'boardgame_vault_sheet_url_v6';
const LAST_SYNC_KEY = 'boardgame_vault_last_sync_v6';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'cabinets' | 'compare' | 'stats' | 'sheet'>('cabinets');

  // Google Workspace Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Games state with local storage fallback
  const [games, setGames] = useState<BoardGame[]>(() => {
    try {
      // Clear legacy caches containing broken image URLs or unseparated cabinets
      ['boardgame_vault_games_v2', 'boardgame_vault_games_v3', 'boardgame_vault_games_v4'].forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length >= 40 &&
          !parsed.some((g: any) => g.name?.toLowerCase() === 'name') &&
          parsed.some((g: any) => g.cabinetType === 'fake')
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved games:', e);
    }
    return INITIAL_BOARDGAMES;
  });

  // Google Sheet state: defaulted to user's active Google Sheet
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem(SHEET_URL_KEY);
    return saved && !saved.includes('demo') ? saved : USER_COLLECTION_SHEET_URL;
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(() => {
    return localStorage.getItem(LAST_SYNC_KEY) || undefined;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Status indicator
  const isCustomSheetConnected = Boolean(
    (sheetUrl && !sheetUrl.includes('demo')) || currentUser
  );
  const isDemoData = !isCustomSheetConnected;

  // Modals state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalCabinet, setAddModalCabinet] = useState<CabinetType>('real');
  const [selectedGame, setSelectedGame] = useState<BoardGame | null>(null);
  const [editingGame, setEditingGame] = useState<BoardGame | null>(null);

  // Initialize Firebase Auth listener on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save games to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    } catch (e) {
      console.error('Error saving games to localStorage:', e);
    }
  }, [games]);

  useEffect(() => {
    if (sheetUrl) {
      localStorage.setItem(SHEET_URL_KEY, sheetUrl);
    }
  }, [sheetUrl]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSignInWithGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        showToast(`Đã kết nối Google: ${res.user.displayName || res.user.email}!`);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      showToast('Đăng nhập Google thất bại hoặc đã bị đóng.');
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    showToast('Đã đăng xuất tài khoản Google.');
  };

  // Switch game between cabinets (Real <-> Fake)
  const handleToggleCabinet = (game: BoardGame, e: React.MouseEvent) => {
    e.stopPropagation();
    const newType: CabinetType = game.cabinetType === 'real' ? 'fake' : 'real';
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? { ...g, cabinetType: newType } : g))
    );
    showToast(
      `Đã chuyển "${game.name}" sang ${newType === 'real' ? 'Real Collection' : 'Replicas & Fake'}!`
    );
    if (selectedGame && selectedGame.id === game.id) {
      setSelectedGame({ ...selectedGame, cabinetType: newType });
    }
  };

  // Google Sheet sync handler (supports both public links & authenticated Google Drive/Sheets API)
  const handleSyncSheet = async (url: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const currentToken = accessToken || (await getAccessToken());
      const result = await fetchFromGoogleSheet(url, currentToken, 'Boardgame Collection');
      if (result.success && result.games.length > 0) {
        setGames(result.games);
        setSheetUrl(url);
        const nowStr = new Date().toLocaleString('vi-VN');
        setLastSyncedAt(nowStr);
        localStorage.setItem(LAST_SYNC_KEY, nowStr);
        if (result.sourceType === 'sample') {
          showToast(`Đã tải ${result.games.length} boardgame mẫu (Demo). Dán link Google Sheet thật của bạn để đồng bộ trực tiếp!`);
        } else {
          showToast(`Đồng bộ thành công ${result.games.length} boardgame từ sheet "Boardgame Collection"!`);
        }
        setIsSyncModalOpen(false);
      } else {
        throw new Error('Không tìm thấy dữ liệu hợp lệ trong Google Sheet.');
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncError(
        err.message || 'Không thể đồng bộ. Vui lòng kiểm tra quyền chia sẻ "Bất kỳ ai có liên kết".'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Import games from CSV
  const handleImportCsv = (importedGames: BoardGame[]) => {
    setGames(importedGames);
    const nowStr = new Date().toLocaleString('vi-VN');
    setLastSyncedAt(nowStr);
    showToast(`Đã nạp ${importedGames.length} game từ file CSV thành công!`);
  };

  // Add / Edit game handler
  const handleSaveGame = (gameToSave: BoardGame) => {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === gameToSave.id);
      if (exists) {
        return prev.map((g) => (g.id === gameToSave.id ? gameToSave : g));
      } else {
        return [gameToSave, ...prev];
      }
    });
    showToast(`Đã lưu "${gameToSave.name}" vào ${gameToSave.cabinetType === 'real' ? 'Real Collection' : 'Replicas & Fake'}!`);
    setEditingGame(null);
  };

  // Delete game handler
  const handleDeleteGame = (id: string) => {
    setGames((prev) => prev.filter((g) => g.id !== id));
    showToast('Đã xóa game khỏi tủ.');
    setSelectedGame(null);
  };

  const handleOpenAddModal = (cabinetType?: CabinetType) => {
    setAddModalCabinet(cabinetType || 'real');
    setEditingGame(null);
    setIsAddModalOpen(true);
  };

  const handleEditGame = (game: BoardGame) => {
    setEditingGame(game);
    setAddModalCabinet(game.cabinetType);
    setSelectedGame(null);
    setIsAddModalOpen(true);
  };

  const realCount = games.filter((g) => g.cabinetType === 'real').length;
  const fakeCount = games.filter((g) => g.cabinetType === 'fake').length;

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 px-4 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs shadow-2xl animate-fade-in flex items-center gap-2 border border-amber-300">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'sheet') {
            setIsSyncModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenAddModal={() => handleOpenAddModal('real')}
        isSyncing={isSyncing}
        totalGames={games.length}
        realCount={realCount}
        fakeCount={fakeCount}
        sheetConnected={Boolean(sheetUrl)}
        currentUser={currentUser}
        onSignInWithGoogle={handleSignInWithGoogle}
      />

      {/* Hero Strip / Google Sheet Status Ribbon */}
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-[#11141c] via-[#161a24] to-[#11141c] px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: Google Sheet sync info */}
          <div className="flex items-center gap-2 text-slate-300">
            <div className={`w-2 h-2 rounded-full ${isCustomSheetConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-medium text-slate-400">Nguồn dữ liệu:</span>
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 font-semibold truncate max-w-[200px] sm:max-w-xs hover:underline flex items-center gap-1"
            >
              <span>
                {currentUser
                  ? `Drive: ${currentUser.email}`
                  : isCustomSheetConnected
                  ? 'Google Sheet đã kết nối'
                  : '16 Game Demo (Chưa kết nối Sheet)'}
              </span>
            </button>
            {lastSyncedAt && isCustomSheetConnected && (
              <span className="text-slate-500 hidden md:inline">
                (Đồng bộ: {lastSyncedAt})
              </span>
            )}
          </div>

          {/* Right: Quick cabinet counts & CTA */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{realCount} Real Collection</span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{fakeCount} Replicas & Fake</span>
              </span>
            </div>

            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-semibold"
            >
              <Sheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isCustomSheetConnected ? 'Cấu hình Sheet' : 'Kết nối Google Sheet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {activeTab === 'cabinets' && (
          <CabinetsView
            games={games}
            onSelectGame={(game) => setSelectedGame(game)}
            onToggleCabinet={handleToggleCabinet}
            onOpenAddModal={handleOpenAddModal}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            isDemoData={isDemoData}
          />
        )}

        {activeTab === 'compare' && (
          <ComparisonMode
            games={games}
            onSelectGame={(game) => setSelectedGame(game)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            games={games}
            onSelectGame={(game) => setSelectedGame(game)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#07090d] py-6 px-4 md:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            BoardGame Vault — Quản lý bộ sưu tập & phân loại Real vs Fake chân thực kết nối Google Sheets & Drive.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Cấu hình Google Sheet
            </button>
            <span>·</span>
            <button
              onClick={() => handleOpenAddModal('real')}
              className="hover:text-slate-300 transition-colors"
            >
              + Thêm boardgame
            </button>
          </div>
        </div>
      </footer>

      {/* Google Sheet Sync Modal */}
      <GoogleSheetModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncSheet={handleSyncSheet}
        onImportCsv={handleImportCsv}
        currentSheetUrl={sheetUrl}
        isSyncing={isSyncing}
        syncError={syncError}
        lastSyncedAt={lastSyncedAt}
        games={games}
        currentUser={currentUser}
        accessToken={accessToken}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
      />

      {/* Game Detail 3D Modal */}
      <GameDetailModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        onToggleCabinet={handleToggleCabinet}
        onEdit={handleEditGame}
        onDelete={handleDeleteGame}
      />

      {/* Add / Edit Game Modal */}
      <AddEditGameModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingGame(null);
        }}
        onSave={handleSaveGame}
        editingGame={editingGame}
        defaultCabinetType={addModalCabinet}
      />
    </div>
  );
}

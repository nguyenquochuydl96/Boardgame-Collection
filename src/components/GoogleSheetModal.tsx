import React, { useState, useEffect } from 'react';
import {
  X,
  Sheet,
  Download,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  RefreshCw,
  Plus,
  FolderOpen,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { generateSampleCsvContent, exportGamesToCsv, parseCsvToGames } from '../services/googleSheets';
import { BoardGame } from '../types/boardgame';
import {
  listUserGoogleSheets,
  createBoardgameSpreadsheetInDrive,
  DriveSheetFile,
} from '../services/googleWorkspace';
import { User } from 'firebase/auth';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSheet: (url: string) => Promise<void>;
  onImportCsv: (games: BoardGame[]) => void;
  currentSheetUrl: string;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt?: string;
  games: BoardGame[];
  currentUser: User | null;
  accessToken: string | null;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  onSyncSheet,
  onImportCsv,
  currentSheetUrl,
  isSyncing,
  syncError,
  lastSyncedAt,
  games,
  currentUser,
  accessToken,
  onSignInWithGoogle,
  onSignOut,
}) => {
  const [sheetUrl, setSheetUrl] = useState(currentSheetUrl);
  const [activeTab, setActiveTab] = useState<'drive' | 'link' | 'template'>('link');
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Drive sheets list
  const [driveSheets, setDriveSheets] = useState<DriveSheetFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Creating new spreadsheet on Drive
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [createdSheetResult, setCreatedSheetResult] = useState<{ id: string; url: string } | null>(null);

  // Fetch Drive sheets when user is signed in
  useEffect(() => {
    if (isOpen && currentUser && accessToken) {
      loadDriveSheets();
    }
  }, [isOpen, currentUser, accessToken]);

  const loadDriveSheets = async () => {
    if (!accessToken) return;
    setIsLoadingDrive(true);
    setDriveError(null);
    try {
      const files = await listUserGoogleSheets(accessToken);
      setDriveSheets(files);
      if (files.length > 0 && activeTab === 'link') {
        setActiveTab('drive');
      }
    } catch (err: any) {
      console.error('Failed to load drive sheets:', err);
      setDriveError(err.message || 'Không thể tải danh sách bảng tính từ Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleSelectDriveSheet = async (file: DriveSheetFile) => {
    const sheetLink = file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
    setSheetUrl(sheetLink);
    await onSyncSheet(sheetLink);
  };

  const handleCreateNewSheetOnDrive = async () => {
    if (!accessToken) {
      await onSignInWithGoogle();
      return;
    }

    setIsCreatingSheet(true);
    setDriveError(null);
    try {
      const result = await createBoardgameSpreadsheetInDrive(
        accessToken,
        `Tủ BoardGame Vault (${new Date().toLocaleDateString('vi-VN')})`,
        games
      );
      setCreatedSheetResult({ id: result.spreadsheetId, url: result.spreadsheetUrl });
      setSheetUrl(result.spreadsheetUrl);
      await loadDriveSheets();
    } catch (err: any) {
      console.error('Failed to create sheet:', err);
      setDriveError(err.message || 'Không thể tạo file Google Sheet mới trên Drive');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  if (!isOpen) return null;

  const handleSyncUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    await onSyncSheet(sheetUrl.trim());
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = generateSampleCsvContent();
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_danh_sach_boardgame_real_fake.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrent = () => {
    const csvContent = exportGamesToCsv(games);
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `boardgame_vault_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedGames = parseCsvToGames(text);
        if (parsedGames.length === 0) {
          setUploadError('File CSV không chứa dòng dữ liệu boardgame hợp lệ.');
          return;
        }
        onImportCsv(parsedGames);
        onClose();
      } catch (err: any) {
        setUploadError(`Lỗi đọc file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCopySampleHeaders = () => {
    const headers =
      'Tên game\tLoại tủ (Real/Fake)\tHình ảnh\tSố người chơi\tThời gian\tThể loại\tGiá tiền\tNhà phát hành\tNăm\tTình trạng\tDấu hiệu nhận biết / Ghi chú\tĐánh giá';
    navigator.clipboard.writeText(headers);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#11141c] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:px-6 flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-white font-display">
                Đồng Bộ Từ Google Sheet
              </h3>
              <p className="text-xs text-slate-400">
                Kết nối Google Drive hoặc dán link Google Sheet để cập nhật 2 tủ game
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/80 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('drive')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'drive'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Google Drive Của Tôi</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Dán Link Bảng Tính</span>
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`px-3 py-1.5 font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'template'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Hướng Dẫn & Mẫu CSV</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: GOOGLE DRIVE FILES & OAUTH SIGN-IN */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              {!currentUser ? (
                /* Official Sign in with Google Button as mandated by skill */
                <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <Sheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Đăng Nhập Bằng Google</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Đăng nhập để xem danh sách các file Google Sheet có sẵn trong Google Drive của bạn và đồng bộ với 1 cú click.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={onSignInWithGoogle}
                      className="gsi-material-button mx-auto"
                    >
                      <div className="gsi-material-button-state"></div>
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">Sign in with Google</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* Authenticated User state */
                <div className="space-y-4">
                  {/* User Bar */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User'}
                          className="w-8 h-8 rounded-full border border-emerald-500/40"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          {currentUser.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-white">
                          {currentUser.displayName || currentUser.email}
                        </p>
                        <p className="text-[11px] text-slate-400">{currentUser.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={onSignOut}
                      className="p-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                      title="Đăng xuất"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                  </div>

                  {/* 1-Click: Create New Sheet on User's Drive */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tạo Bảng Tính Mới Trên Google Drive</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Tạo một file Google Sheet mới trong Google Drive của bạn chứa sẵn toàn bộ game Real & Fake.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateNewSheetOnDrive}
                      disabled={isCreatingSheet}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isCreatingSheet ? 'Đang tạo...' : 'Tạo Sheet Mới'}</span>
                    </button>
                  </div>

                  {createdSheetResult && (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-200 flex items-center justify-between">
                      <span>File mới đã được tạo trên Google Drive của bạn!</span>
                      <a
                        href={createdSheetResult.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline flex items-center gap-1 text-white hover:text-amber-300"
                      >
                        <span>Mở Bảng Tính</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Drive File List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        Bảng Tính Google Sheets Tìm Thấy Trên Drive ({driveSheets.length}):
                      </span>
                      <button
                        onClick={loadDriveSheets}
                        disabled={isLoadingDrive}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                      </button>
                    </div>

                    {isLoadingDrive ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                        <span>Đang tìm kiếm các file Google Sheet trong Drive của bạn...</span>
                      </div>
                    ) : driveSheets.length === 0 ? (
                      <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                        Chưa tìm thấy file Google Sheet nào trên Drive của bạn. Bạn có thể bấm "Tạo Sheet Mới" ở trên!
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                        {driveSheets.map((file) => (
                          <div
                            key={file.id}
                            className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Sheet className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                {file.modifiedTime && (
                                  <p className="text-[10px] text-slate-500">
                                    Cập nhật: {new Date(file.modifiedTime).toLocaleDateString('vi-VN')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSelectDriveSheet(file)}
                              disabled={isSyncing}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition-colors shrink-0 flex items-center gap-1"
                            >
                              <span>Chọn & Đồng Bộ</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL GOOGLE SHEET LINK */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <form onSubmit={handleSyncUrl} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Dán Đường Dẫn Google Sheet (URL):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Đang Tải...' : 'Đồng Bộ Ngay'}</span>
                  </button>
                </div>
              </form>

              {/* Status alerts */}
              {syncError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{syncError}</span>
                </div>
              )}

              {lastSyncedAt && !syncError && (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Đồng bộ thành công gần nhất: {lastSyncedAt}</span>
                  </div>
                  <span className="font-mono text-[11px] opacity-80">{games.length} boardgame</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEMPLATE & GUIDE */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Cách Thiết Lập Bảng Tính (3 Bước Nhanh)</span>
                </h4>
                <ol className="space-y-2 text-xs text-slate-300 list-decimal pl-4 leading-relaxed">
                  <li>
                    <strong className="text-white">Tạo hoặc mở Google Sheet:</strong> Bấm nút{' '}
                    <button
                      onClick={handleDownloadSampleCsv}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      Tải file mẫu CSV
                    </button>{' '}
                    ở dưới rồi upload lên Google Drive.
                  </li>
                  <li>
                    <strong className="text-white">Mở quyền xem:</strong> Nhấn nút{' '}
                    <span className="text-amber-300 font-semibold">Chia Sẻ (Share)</span> ➔ Chọn{' '}
                    <span className="text-emerald-300 font-semibold">Bất kỳ ai có đường liên kết</span> (hoặc Đăng nhập Google ở tab 1).
                  </li>
                  <li>
                    <strong className="text-white">Đồng bộ:</strong> Copy đường link và dán vào tab "Dán Link Bảng Tính".
                  </li>
                </ol>
              </div>

              {/* Supported Columns */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Cột dữ liệu được hỗ trợ tự động:
                  </span>
                  <button
                    onClick={handleCopySampleHeaders}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Đã copy!' : 'Copy tên cột'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  <p>
                    <span className="text-amber-300">Tên game</span> |{' '}
                    <span className="text-amber-300">Loại tủ</span> (Real hoặc Fake) |{' '}
                    <span className="text-amber-300">Hình ảnh</span> (URL ảnh) |{' '}
                    <span className="text-slate-300">Số người chơi</span> |{' '}
                    <span className="text-slate-300">Thời gian</span> |{' '}
                    <span className="text-slate-300">Thể loại</span> |{' '}
                    <span className="text-slate-300">Giá tiền</span> |{' '}
                    <span className="text-slate-300">Nhà phát hành</span> |{' '}
                    <span className="text-slate-300">Năm</span> |{' '}
                    <span className="text-slate-300">Tình trạng</span> |{' '}
                    <span className="text-slate-300">Ghi chú / Dấu hiệu nhận biết</span> |{' '}
                    <span className="text-slate-300">Đánh giá</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick CSV Export / Import Buttons */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadSampleCsv}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Tải File Mẫu (CSV)</span>
            </button>

            <button
              onClick={handleExportCurrent}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Xuất Dữ Liệu Hiện Tại (CSV)</span>
            </button>

            <label className="sm:col-span-2 cursor-pointer px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 border-dashed text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Hoặc tải trực tiếp file CSV từ máy tính</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadError && (
            <p className="text-xs text-rose-400 text-center">{uploadError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

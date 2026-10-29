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
import {
  generateSampleCsvContent,
  exportGamesToCsv,
  parseCsvToGames,
  SAMPLE_GOOGLE_SHEET_URL,
  USER_COLLECTION_SHEET_URL,
} from '../services/googleSheets';
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
  const [sheetUrl, setSheetUrl] = useState(() =>
    currentSheetUrl || USER_COLLECTION_SHEET_URL
  );
  const [activeTab, setActiveTab] = useState<'drive' | 'link' | 'template'>('link');
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (currentSheetUrl) {
      setSheetUrl(currentSheetUrl);
    }
  }, [currentSheetUrl]);

  // Drive sheets list
  const [driveSheets, setDriveSheets] = useState<DriveSheetFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Creating new spreadsheet on Drive
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [createdSheetResult, setCreatedSheetResult] = useState<{ id: string; url: string } | null>(null);

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
        // keep as is
      }
    } catch (err: any) {
      console.error('Error loading Google Drive sheets:', err);
      setDriveError(err.message || 'Unable to load Google Drive spreadsheets.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleCreateNewSheetOnDrive = async () => {
    if (!accessToken) {
      await onSignInWithGoogle();
      return;
    }
    setIsCreatingSheet(true);
    setDriveError(null);
    try {
      const result = await createBoardgameSpreadsheetInDrive(accessToken, 'Bộ Sưu Tập BoardGame Vault (Real & Fake)', games);
      setCreatedSheetResult({ id: result.spreadsheetId, url: result.spreadsheetUrl });
      setSheetUrl(result.spreadsheetUrl);
      await loadDriveSheets();
      await onSyncSheet(result.spreadsheetUrl);
    } catch (err: any) {
      console.error('Error creating Google Sheet on Drive:', err);
      setDriveError(err.message || 'Failed to create new spreadsheet on Google Drive.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSelectDriveSheet = (file: DriveSheetFile) => {
    const fullUrl = `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
    setSheetUrl(fullUrl);
    onSyncSheet(fullUrl);
  };

  const handleSyncUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    await onSyncSheet(sheetUrl.trim());
  };

  const handleDownloadCsv = () => {
    const csv = exportGamesToCsv(games);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `boardgame-vault-collection-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleDownloadSampleCsv = () => {
    const csv = generateSampleCsvContent();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `boardgame-vault-sample-template.csv`;
    link.click();
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
          setUploadError('Could not find valid board game rows in this CSV file.');
          return;
        }
        onImportCsv(parsedGames);
        onClose();
      } catch (err: any) {
        setUploadError(`CSV parse error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCopySampleHeaders = () => {
    const headers =
      'Name\tCabinet (Real Collection/Replicas & Fake)\tStatus (On Hand/OOS)\tImage URL\tPlayers\tPlaytime\tCategory\tPrice\tPublisher\tYear\tCondition\tAuthenticity Notes\tRating';
    navigator.clipboard.writeText(headers);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

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
                Google Sheets Collection Sync
              </h3>
              <p className="text-xs text-slate-400">
                Sync live data from sheet tab <strong className="text-emerald-400">"Boardgame Collection"</strong> into Authentic & Counterfeit cabinets
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
            <span>Google Drive Workspace</span>
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
            <span>Direct Spreadsheet Link</span>
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
            <span>Guide & CSV Template</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: GOOGLE DRIVE FILES & OAUTH SIGN-IN */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              {!currentUser ? (
                <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <Sheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Sign In With Google</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Connect your Google Drive to view your existing spreadsheets and sync with 1 click.
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
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sign Out</span>
                    </button>
                  </div>

                  {/* 1-Click: Create New Sheet on User's Drive */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Create New Spreadsheet on Google Drive</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Creates an empty template or populates your current collection directly in your Drive.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateNewSheetOnDrive}
                      disabled={isCreatingSheet}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isCreatingSheet ? 'Creating...' : 'Create New Sheet'}</span>
                    </button>
                  </div>

                  {createdSheetResult && (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-200 flex items-center justify-between">
                      <span>Spreadsheet successfully created in your Google Drive!</span>
                      <a
                        href={createdSheetResult.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline flex items-center gap-1 text-white hover:text-amber-300"
                      >
                        <span>Open Sheet</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Drive File List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        Spreadsheets Found on Drive ({driveSheets.length}):
                      </span>
                      <button
                        onClick={loadDriveSheets}
                        disabled={isLoadingDrive}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {isLoadingDrive ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                        <span>Scanning Google Drive files...</span>
                      </div>
                    ) : driveSheets.length === 0 ? (
                      <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                        No Google Sheets found. Click "Create New Sheet" above to get started!
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
                                    Updated: {new Date(file.modifiedTime).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSelectDriveSheet(file)}
                              disabled={isSyncing}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md transition-colors shrink-0 flex items-center gap-1"
                            >
                              <span>Select & Sync</span>
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
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>How to connect your Google Sheet:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 leading-relaxed">
                  <li>
                    Open your Google Sheet (with a tab named <strong className="text-emerald-300">"Boardgame Collection"</strong>).
                  </li>
                  <li>
                    Copy the browser URL bar (e.g. <code>https://docs.google.com/spreadsheets/d/.../edit#gid=0</code>) and paste it below.
                  </li>
                  <li>
                    Enable view access: <strong>Share &rarr; Anyone with the link &rarr; Viewer</strong> (or switch to the Google Drive tab above to authenticate).
                  </li>
                </ul>
              </div>

              <form onSubmit={handleSyncUrl} className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <label className="font-semibold text-slate-200 uppercase tracking-wider">
                    Google Sheet URL:
                  </label>
                  <span className="text-[11px] text-emerald-300 font-medium bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
                    Target tab: <strong>Boardgame Collection</strong>
                  </span>
                </div>
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
                    disabled={isSyncing || !sheetUrl.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-400">
                    The app scans tab <span className="text-emerald-400 font-semibold">"Boardgame Collection"</span> and sorts by <span className="text-amber-300 font-semibold">Status (On Hand / OOS)</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSheetUrl(SAMPLE_GOOGLE_SHEET_URL);
                      onSyncSheet(SAMPLE_GOOGLE_SHEET_URL);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    Use Sample Demo
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: CSV IMPORT & TEMPLATE GUIDE */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Standard Columns Format:
                  </h4>
                  <button
                    onClick={handleCopySampleHeaders}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copied ? 'Copied!' : 'Copy Column Headers'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                  Name | Cabinet (Real/Fake) | Status (On Hand/OOS) | Image URL | Players | Playtime | Category | Price | Publisher | Year | Condition | Authenticity Notes | Rating
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Download Sample CSV Template</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Contains pre-formatted sample rows with official box covers and BGG stats.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSampleCsv}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors"
                  >
                    Download Template (.csv)
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Import Existing CSV File</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Upload your collection CSV file directly without Google Sheets.
                    </p>
                  </div>
                  <label className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg text-center cursor-pointer transition-colors block">
                    <span>Upload CSV File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Sync status messages */}
          {syncError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white">Sync Error:</p>
                <p className="mt-0.5 text-rose-300/90 leading-relaxed">{syncError}</p>
              </div>
            </div>
          )}

          {lastSyncedAt && !syncError && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Last synced: {lastSyncedAt}</span>
              </span>
              <span className="text-slate-400">({games.length} total games)</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Collection (.csv)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

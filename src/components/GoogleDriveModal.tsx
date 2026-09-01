import React, { useState, useEffect } from 'react';
import { 
  X, 
  HardDrive, 
  Folder, 
  FolderPlus, 
  FileText, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  FileSpreadsheet, 
  AlertCircle, 
  Image as ImageIcon,
  Database,
  ArrowRight,
  ShieldCheck,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { 
  getGoogleDriveStatus, 
  requestGoogleDriveAccess, 
  initializeGoogleDriveFolders, 
  uploadToGoogleDrive, 
  syncDatabaseToGoogleDrive, 
  listGoogleDriveFiles,
  disconnectGoogleDrive
} from '../services/googleDriveService';
import { GoogleDriveFile, GoogleDriveFolderStructure, GoogleDriveSyncResult } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const { records } = useWarehouse();

  const [activeTab, setActiveTab] = useState<'overview' | 'folders' | 'sync' | 'upload_test'>('overview');
  const [status, setStatus] = useState(getGoogleDriveStatus());
  const [folders, setFolders] = useState<GoogleDriveFolderStructure | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [syncResult, setSyncResult] = useState<GoogleDriveSyncResult | null>(null);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Test upload form state
  const [testCategory, setTestCategory] = useState<'SuratJalan' | 'DamagePhotos'>('SuratJalan');
  const [testQueue, setTestQueue] = useState<string>('#Q-001');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileData, setSelectedFileData] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      refreshDriveState();
    }
  }, [isOpen]);

  const refreshDriveState = async () => {
    const currentStatus = getGoogleDriveStatus();
    setStatus(currentStatus);
    
    // Load cached or initialize folders
    try {
      const f = await initializeGoogleDriveFolders();
      setFolders(f);
      const fList = await listGoogleDriveFiles();
      setFiles(fList);
    } catch (e) {
      console.warn('Error loading folder data', e);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMessage(null);
    try {
      await requestGoogleDriveAccess();
      const f = await initializeGoogleDriveFolders();
      setFolders(f);
      setStatus(getGoogleDriveStatus());
      const fList = await listGoogleDriveFiles();
      setFiles(fList);
      setStatusMessage('Google Drive berhasil terhubung dan siap digunakan!');
    } catch (err: any) {
      setStatusMessage(`Gagal menghubungkan Google Drive: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleDrive();
    setStatus(getGoogleDriveStatus());
    setFolders(null);
    setStatusMessage('Sesi Google Drive telah diputus.');
  };

  const handleSyncAllData = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const res = await syncDatabaseToGoogleDrive(records);
      setSyncResult(res);
      setStatus(getGoogleDriveStatus());
      const fList = await listGoogleDriveFiles();
      setFiles(fList);
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage(`Gagal sinkronisasi data: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFileData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestUpload = async () => {
    if (!selectedFileData) {
      alert('Pilih file terlebih dahulu untuk diunggah.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadToGoogleDrive({
        fileName: selectedFileName || 'test_file.jpg',
        fileData: selectedFileData,
        fileCategory: testCategory,
        queueNumber: testQueue,
      });
      setUploadResult(res);
      const fList = await listGoogleDriveFiles();
      setFiles(fList);
      setStatusMessage(`File berhasil diunggah ke Google Drive: ${res.fileName}`);
    } catch (err: any) {
      setStatusMessage(`Gagal mengunggah file: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Google Drive Storage &amp; Sync Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 border border-emerald-300/30 text-emerald-100">
                  Drive v3 API
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Penyimpanan Berkas Surat Jalan, Foto Kerusakan, dan Sinkronisasi Log Database WH CKL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account & Storage Connection Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="text-slate-500">Target Akun:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {status.userEmail || 'lkusdewanto@gmail.com'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Google Drive Terhubung</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {folders?.rootFolderUrl && (
              <a
                href={folders.rootFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
              >
                <span>Buka Google Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
              <span>{isConnecting ? 'Memproses...' : 'Refresh Token'}</span>
            </button>
          </div>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
              &times;
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Struktur Folder Drive</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Sinkronisasi Data ({records.length} Record)</span>
          </button>
          <button
            onClick={() => setActiveTab('upload_test')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'upload_test'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Berkas &amp; Foto</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* TAB 1: OVERVIEW & FOLDERS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-emerald-600" />
                      Struktur Direktori Google Drive Otomatis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sistem mengorganisir dokumen Surat Jalan dan foto kerusakan ke dalam folder terstruktur di Google Drive Anda.
                    </p>
                  </div>
                  <button
                    onClick={refreshDriveState}
                    className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Perbarui Folder
                  </button>
                </div>

                {/* Tree Structure Visual */}
                <div className="space-y-2 text-xs font-mono bg-slate-900 text-slate-200 p-4 rounded-xl shadow-inner">
                  <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      📁 /Bongkar WH CKL/
                    </span>
                    <a
                      href={folders?.rootFolderUrl || 'https://drive.google.com'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      Buka di Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="pl-4 space-y-2 pt-2">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        ├── 📁 Surat_Jalan/ <span className="text-slate-500 text-[10px]">(Scan/Foto Surat Jalan dari Security &amp; Admin)</span>
                      </span>
                      <a
                        href={folders?.suratJalanFolderUrl || 'https://drive.google.com'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline text-[10px] flex items-center gap-1"
                      >
                        <span>Buka Folder</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        ├── 📁 Foto_Kondisi_Barang/ <span className="text-slate-500 text-[10px]">(Bukti Rusak/Selisih dari Admin T4)</span>
                      </span>
                      <a
                        href={folders?.damagePhotosFolderUrl || 'https://drive.google.com'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline text-[10px] flex items-center gap-1"
                      >
                        <span>Buka Folder</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        └── 📁 Rekap_Data_Log/ <span className="text-slate-500 text-[10px]">(Export JSON Database &amp; CSV Spreadsheet)</span>
                      </span>
                      <a
                        href={folders?.logsFolderUrl || 'https://drive.google.com'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline text-[10px] flex items-center gap-1"
                      >
                        <span>Buka Folder</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Files in Drive List */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Daftar Berkas Terkini di Google Drive
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {files.length} Item Tersedia
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {files.map((file) => {
                    const isFolder = file.mimeType.includes('folder');
                    const isCsv = file.name.endsWith('.csv');
                    const isJson = file.name.endsWith('.json');
                    const isImg = file.name.endsWith('.jpg') || file.name.endsWith('.png');

                    return (
                      <div key={file.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isFolder ? (
                            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : isCsv ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isJson ? (
                            <Database className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {file.createdTime ? new Date(file.createdTime).toLocaleString('id-ID') : 'Hari ini'}
                            </span>
                          </div>
                        </div>

                        <a
                          href={file.webViewLink || 'https://drive.google.com'}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 shrink-0 transition"
                        >
                          <span>Buka</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA SYNC TO GOOGLE DRIVE */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      Sinkronisasi Database Log &amp; Rekap Milestone ke Google Drive
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mengekspor {records.length} antrean truk aktif beserta milestone T1-T4, lead time, PIC, catatan, dan link media ke Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={handleSyncAllData}
                    disabled={isSyncing}
                    id="btn-sync-all-gdrive"
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>

                {/* Synchronization Card Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Export Spreadsheet CSV (Google Sheets)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Format baris tabel terstruktur siap buka langsung di Google Sheets untuk kebutuhan audit &amp; laporan manajemen.
                    </p>
                    {syncResult?.csvFileUrl && (
                      <a
                        href={syncResult.csvFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline pt-1"
                      >
                        Lihat File CSV di Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Database className="w-4 h-4 text-blue-600" />
                      Export JSON Database Backup
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Cadangan data lengkap JSON mencakup semua metadata, array foto, dan status workflow antrean.
                    </p>
                    {syncResult?.dataFileUrl && (
                      <a
                        href={syncResult.dataFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-700 font-bold hover:underline pt-1"
                      >
                        Lihat File JSON di Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Sync Result Box */}
                {syncResult && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{syncResult.message}</span>
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      Waktu Sinkronisasi: {new Date(syncResult.syncedAt).toLocaleString('id-ID')}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Preview Table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Data yang Akan Tersinkronisasi ({records.length} Antrean)
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2">No. Antrean</th>
                        <th className="p-2">Supplier</th>
                        <th className="p-2">Nopol</th>
                        <th className="p-2">Tipe</th>
                        <th className="p-2">T1 (Masuk)</th>
                        <th className="p-2">T4 (Selesai)</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-emerald-800">{r.queueNumber}</td>
                          <td className="p-2 truncate max-w-[140px]">{r.supplierName}</td>
                          <td className="p-2 font-mono">{r.licensePlate}</td>
                          <td className="p-2">{r.vehicleType}</td>
                          <td className="p-2 text-[11px] text-slate-500">{new Date(r.t1GateIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-2 text-[11px] text-slate-500">{r.t4UnloadingFinish ? new Date(r.t4UnloadingFinish).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className="p-2 font-semibold text-[10px]">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEST UPLOAD */}
          {activeTab === 'upload_test' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    Uji Unggah Berkas &amp; Foto Langsung ke Google Drive
                  </h3>
                  <p className="text-xs text-slate-500">
                    Berkas akan otomatis disimpan di subfolder Google Drive yang sesuai.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Kategori Berkas:
                    </label>
                    <select
                      value={testCategory}
                      onChange={(e) => setTestCategory(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="SuratJalan">Surat Jalan (Folder: /Surat_Jalan/)</option>
                      <option value="DamagePhotos">Foto Kondisi / Kerusakan (Folder: /Foto_Kondisi_Barang/)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nomor Antrean Target:
                    </label>
                    <select
                      value={testQueue}
                      onChange={(e) => setTestQueue(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                    >
                      {records.map((r) => (
                        <option key={r.id} value={r.queueNumber}>
                          {r.queueNumber} - {r.supplierName} ({r.licensePlate})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition">
                  <input
                    type="file"
                    id="gdrive-file-input"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <label htmlFor="gdrive-file-input" className="cursor-pointer block space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedFileName ? selectedFileName : 'Klik untuk memilih foto atau dokumen Surat Jalan'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Mendukung format JPG, PNG, WEBP, PDF
                    </div>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleTestUpload}
                    disabled={!selectedFileData || isUploading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
                    <span>{isUploading ? 'Mengunggah ke Drive...' : 'Unggah ke Google Drive'}</span>
                  </button>
                </div>

                {/* Upload Result Preview */}
                {uploadResult && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Unggah Berhasil!
                      </span>
                      <a
                        href={uploadResult.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                      >
                        Buka Berkas di Google Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800">
                      <div>File: {uploadResult.fileName}</div>
                      <div>Provider: {uploadResult.provider}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Terotentikasi ke Google Drive API (Scope: drive.file)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

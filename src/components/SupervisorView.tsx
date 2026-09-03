import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  ArrowUpDown, 
  Eye, 
  TrendingUp, 
  CheckCircle,
  HelpCircle,
  PackageCheck,
  Home,
  LogOut,
  ArrowLeft,
  Tv,
  Sparkles,
  HardDrive,
  Trash2,
  RefreshCw,
  ArrowRightLeft,
  ArrowRight,
  Check,
  X,
  Ban
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { VehicleType, VEHICLE_LEAD_TIMES, STANDARD_VEHICLE_TYPES, UnloadingRecord } from '../types';
import { GoogleDriveModal } from './GoogleDriveModal';
import { 
  formatShortTime, 
  formatDate, 
  formatDateTime,
  formatDuration, 
  calculateLeadTime, 
  exportToCSV,
  getLocalDateString,
  isRecordToday
} from '../utils/timeUtils';

export const SupervisorView: React.FC = () => {
  const { 
    records, 
    stats, 
    currentTime, 
    setSelectedRecord, 
    setIsWallboardOpen, 
    setIsAiModalOpen,
    returnToPortal,
    logout,
    authUser,
    clearAllData,
    isSyncing,
    refreshDataFromServer,
    approveZoneChange,
    rejectZoneChange,
    cancelRecord
  } = useWarehouse();

  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Permintaan Ganti Zona Bongkar (Operator -> SPV)
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [isActingId, setIsActingId] = useState<string | null>(null);

  // Fitur Batalkan Bongkaran (Khusus SPV)
  const [cancellingRecord, setCancellingRecord] = useState<UnloadingRecord | null>(null);
  const [cancelReasonOption, setCancelReasonOption] = useState<string>('Input kedobel dari security');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [cancelNotes, setCancelNotes] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'TODAY' | 'ALL' | string>('TODAY');
  const [customDateValue, setCustomDateValue] = useState<string>(getLocalDateString());
  const [sortField, setSortField] = useState<'queueNumber' | 'supplierName' | 't1GateIn' | 'variance'>('t1GateIn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'live_table' | 'cancelled_list' | 'analytics_report'>('live_table');

  // Daftar Armada yang Dibatalkan
  const cancelledRecords = useMemo(() => {
    const todayStr = getLocalDateString();
    return records
      .filter((r) => {
        if (r.status !== 'CANCELLED') return false;
        if (selectedDateFilter === 'TODAY') return isRecordToday(r, todayStr);
        if (selectedDateFilter === 'CUSTOM') return isRecordToday(r, customDateValue);
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.t1GateIn).getTime();
        const timeB = new Date(b.t1GateIn).getTime();
        return timeB - timeA;
      });
  }, [records, selectedDateFilter, customDateValue]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    const todayStr = getLocalDateString();
    return records
      .filter((rec) => {
        // Date filter
        if (selectedDateFilter === 'TODAY') {
          if (!isRecordToday(rec, todayStr)) return false;
        } else if (selectedDateFilter === 'CUSTOM') {
          if (!isRecordToday(rec, customDateValue)) return false;
        }
        // 'ALL' allows all history records

        const matchesSearch = 
          rec.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.queueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (rec.poNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesVehicle = selectedVehicleType === 'ALL' || rec.vehicleType === selectedVehicleType;
        const matchesStatus = selectedStatus === 'ALL' || rec.status === selectedStatus;

        return matchesSearch && matchesVehicle && matchesStatus;
      })
      .sort((a, b) => {
        if (sortField === 'queueNumber') {
          return sortOrder === 'asc' 
            ? a.queueNumber.localeCompare(b.queueNumber) 
            : b.queueNumber.localeCompare(a.queueNumber);
        }
        if (sortField === 'supplierName') {
          return sortOrder === 'asc'
            ? a.supplierName.localeCompare(b.supplierName)
            : b.supplierName.localeCompare(a.supplierName);
        }
        if (sortField === 'variance') {
          const varA = calculateLeadTime(a, currentTime).varianceMinutes;
          const varB = calculateLeadTime(b, currentTime).varianceMinutes;
          return sortOrder === 'asc' ? varA - varB : varB - varA;
        }
        // default t1GateIn
        const timeA = new Date(a.t1GateIn).getTime();
        const timeB = new Date(b.t1GateIn).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [records, searchQuery, selectedVehicleType, selectedStatus, selectedDateFilter, customDateValue, sortField, sortOrder, currentTime]);

  // Analytics Aggregations (computed based on filtered records)
  const analyticsData = useMemo(() => {
    const vehicleCounts: Record<string, { total: number; onTime: number; overdue: number; avgActualMinutes: number; totalMinutes: number }> = {};
    let sesuaiCount = 0;
    let selisihCount = 0;
    let rusakCount = 0;
    let totalCompleted = 0;

    STANDARD_VEHICLE_TYPES.forEach((type) => {
      vehicleCounts[type] = { total: 0, onTime: 0, overdue: 0, avgActualMinutes: 0, totalMinutes: 0 };
    });

    filteredRecords.forEach((r) => {
      // Eksklusi armada berstatus CANCELLED dari metrik analytics dan SLA
      if (r.status === 'CANCELLED') return;

      const analysis = calculateLeadTime(r, currentTime);
      const type = r.vehicleType;
      if (!vehicleCounts[type]) {
        vehicleCounts[type] = { total: 0, onTime: 0, overdue: 0, avgActualMinutes: 0, totalMinutes: 0 };
      }

      vehicleCounts[type].total++;
      if (analysis.isOverdue) {
        vehicleCounts[type].overdue++;
      } else if (r.status === 'SELESAI_BONGKAR' || r.status === 'FINISHED') {
        vehicleCounts[type].onTime++;
      }

      if ((r.status === 'SELESAI_BONGKAR' || r.status === 'FINISHED') && analysis.actualUnloadingMinutes > 0) {
        vehicleCounts[type].totalMinutes += analysis.actualUnloadingMinutes;
      }

      if (r.status === 'SELESAI_BONGKAR' || r.status === 'FINISHED') {
        totalCompleted++;
        if (r.goodsCondition === 'Sesuai') sesuaiCount++;
        else if (r.goodsCondition === 'Selisih') selisihCount++;
        else if (r.goodsCondition === 'Rusak') rusakCount++;
      }
    });

    Object.keys(vehicleCounts).forEach((type) => {
      const item = vehicleCounts[type];
      const count = item.onTime + item.overdue;
      item.avgActualMinutes = count > 0 ? Math.round(item.totalMinutes / count) : VEHICLE_LEAD_TIMES[type as VehicleType]?.minutes || 60;
    });

    return {
      vehicleCounts,
      goodsConditionStats: {
        sesuaiCount,
        selisihCount,
        rusakCount,
        totalCompleted,
      }
    };
  }, [filteredRecords, currentTime]);

  const handleExportCSV = () => {
    const dateLabel = selectedDateFilter === 'TODAY' 
      ? getLocalDateString() 
      : selectedDateFilter === 'CUSTOM' 
        ? customDateValue 
        : 'Semua_Riwayat';
    exportToCSV(filteredRecords, `Laporan_Bongkar_${dateLabel}.csv`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Permintaan Ganti Zona Bongkar (Operator -> SPV)
  const pendingZoneRequests = useMemo(() => {
    return records.filter((r) => r.zoneChangeRequest && r.zoneChangeRequest.status === 'PENDING');
  }, [records]);

  const handleApproveZone = async (rec: UnloadingRecord) => {
    if (!rec.zoneChangeRequest) return;
    const target = rec.zoneChangeRequest.requestedZone;
    try {
      setIsActingId(rec.id);
      await approveZoneChange(rec.id);
      setActionToast(`Berhasil menyetujui pemindahan zona armada ${rec.queueNumber} ke "${target}"!`);
      setTimeout(() => setActionToast(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyetujui pergantian zona.');
    } finally {
      setIsActingId(null);
    }
  };

  const handleRejectZone = async (rec: UnloadingRecord) => {
    try {
      setIsActingId(rec.id);
      await rejectZoneChange(rec.id);
      setActionToast(`Permohonan ganti zona armada ${rec.queueNumber} telah ditolak.`);
      setTimeout(() => setActionToast(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Gagal menolak permohonan.');
    } finally {
      setIsActingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:p-0 print:m-0">
      {/* Toast Notification */}
      {actionToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionToast}</span>
          </div>
          <button 
            onClick={() => setActionToast(null)} 
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={returnToPortal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer mr-1"
              title="Kembali ke Halaman Utama / Ganti Role"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 font-mono">
              SPV &amp; EXECUTIVE WALLBOARD
            </span>
            {authUser && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                👤 {authUser.name}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            Dashboard Monitoring &amp; Analisis Lead Time Bongkar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Pemantauan performa aktual vs standar lead time armada supplier secara real-time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh Sync */}
          <button
            onClick={() => refreshDataFromServer()}
            id="btn-spv-refresh-sync"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200"
            title="Sinkronkan Data Server Sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={() => setIsGoogleDriveOpen(true)}
            id="btn-spv-gdrive"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer"
            title="Integrasi Google Drive Storage & Sync"
          >
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span>Google Drive</span>
          </button>

          <button
            onClick={() => setIsWallboardOpen(true)}
            id="btn-spv-tv"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer"
            title="Layar Penuh TV Wallboard"
          >
            <Tv className="w-4 h-4 text-emerald-600" />
            <span>TV Wallboard</span>
          </button>

          <button
            onClick={handleExportCSV}
            id="btn-export-csv"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            id="btn-print-report"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak</span>
          </button>

          {/* Reset / Clear All Data Button */}
          <button
            onClick={() => setIsClearConfirmOpen(true)}
            id="btn-spv-clear-all-data"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition cursor-pointer"
            title="Kosongkan seluruh data antrean dan riwayat pada server lintas perangkat"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Reset Data</span>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
            title="Logout Supervisor"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PENDING ZONE CHANGE REQUESTS SECTION (OPERATOR -> SPV) */}
      {pendingZoneRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-200 text-amber-900">
                <ArrowRightLeft className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-950 flex items-center gap-2">
                  <span>Permintaan Relokasi / Ganti Zona Bongkar</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-xs font-black animate-pulse">
                    {pendingZoneRequests.length} Menunggu Persetujuan
                  </span>
                </h3>
                <p className="text-xs text-amber-800">
                  Operator lapangan mengajukan pemindahan zona bongkar armada di bawah ini. Silakan tinjau dan berikan keputusan:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingZoneRequests.map((rec) => {
              const req = rec.zoneChangeRequest!;
              const isActing = isActingId === rec.id;

              return (
                <div
                  key={rec.id}
                  className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between hover:border-amber-400 transition"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {rec.queueNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Diajukan: {formatShortTime(req.requestedAt)}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{rec.supplierName}</h4>
                      <p className="text-xs font-mono text-slate-600">
                        {rec.licensePlate} • {rec.driverName} • {rec.vehicleType}
                      </p>
                    </div>

                    {/* Zone Transition */}
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Zona Asal</span>
                        <span className="font-semibold text-slate-700">{rec.assignedDock || 'Belum Ditentukan'}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] text-amber-800 block uppercase font-extrabold">Zona Tujuan Baru</span>
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {req.requestedZone}
                        </span>
                      </div>
                    </div>

                    {/* Alasan */}
                    <div className="text-xs space-y-1">
                      <span className="text-slate-500 font-medium">Alasan Operator ({req.requestedBy}):</span>
                      <p className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700 italic text-[11px]">
                        &quot;{req.reason}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Actions: Setujui vs Tolak */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleRejectZone(rec)}
                      className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleApproveZone(rec)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50 active:scale-[0.98]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui Pindah ke {req.requestedZone}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 QUICK STAT CARDS (SPECIFICATION CORE REQUIREMENT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kedatangan Hari Ini */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              1. Total Kedatangan
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-800 font-mono">
                {stats.totalToday}
              </span>
              <span className="text-xs font-normal text-slate-400">Truk</span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <p className="text-[11px] text-slate-400">Sejak 00:00 WIB</p>
              {stats.cancelledToday > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                  <Ban className="w-2.5 h-2.5" /> Dibatalkan: {stats.cancelledToday} Armada
                </span>
              )}
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-full text-blue-600">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Menunggu Cek PO / Ready Bongkar */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-1">
              2. Menunggu PO / Ready
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-orange-500 font-mono">
                {stats.waitingPO + stats.readyDock}
              </span>
              <span className="text-xs font-normal text-slate-400">({stats.waitingPO} PO + {stats.readyDock} Dock)</span>
            </div>
            <p className="text-[11px] text-orange-500/90 mt-1">Tahap administrasi dock</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-full text-orange-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Sedang Proses Bongkar (Live Counter) */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                3. Sedang Bongkar
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">
                {stats.activeUnloading}
              </span>
              <span className="text-xs font-normal text-slate-400">Live Active</span>
            </div>
            <div className="mt-1 text-[11px]">
              {stats.overdueCount > 0 ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {stats.overdueCount} Truk Overdue!
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">Semua On-Track</span>
              )}
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-full text-blue-600">
            <Clock className="w-6 h-6 animate-spin" />
          </div>
        </div>

        {/* Card 4: Selesai Bongkar */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">
              4. Selesai Bongkar (T4)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">
                {stats.completedToday}
              </span>
              <span className="text-xs font-normal text-slate-400">Selesai</span>
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">
              SLA Compliance: <strong>{stats.onTimeRate}%</strong>
            </p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-full text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub Navigation: Live Monitoring Table vs Cancelled List vs Analytics & Variance */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:hidden flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('live_table')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'live_table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Live Monitoring Table</span>
          </button>

          <button
            onClick={() => setActiveTab('cancelled_list')}
            id="tab-spv-cancelled-list"
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'cancelled_list'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Daftar Dibatalkan / Cancelled</span>
            {cancelledRecords.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'cancelled_list' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {cancelledRecords.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics_report')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'analytics_report'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Lead Time Variance &amp; Analytics</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono hidden md:block">
          Terakhir diperbarui: {new Date(currentTime).toLocaleTimeString('id-ID')}
        </div>
      </div>

      {/* TAB 1: LIVE MONITORING TABLE (SPECIFICATION CORE REQUIREMENT) */}
      {activeTab === 'live_table' && (
        <div className="space-y-4">
          {/* Table Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari No Antrean, Supplier, No Plat, Driver, PO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Date */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-0.5">
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="TODAY">🟢 Hari Ini (Live)</option>
                  <option value="CUSTOM">📆 Pilih Tanggal...</option>
                  <option value="ALL">📚 Semua Riwayat Database</option>
                </select>
                {selectedDateFilter === 'CUSTOM' && (
                  <input
                    type="date"
                    value={customDateValue}
                    onChange={(e) => setCustomDateValue(e.target.value)}
                    className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded text-slate-800 font-mono focus:outline-none"
                  />
                )}
              </div>

              {/* Filter Vehicle */}
              <select
                value={selectedVehicleType}
                onChange={(e) => setSelectedVehicleType(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Semua Kendaraan</option>
                {STANDARD_VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type} ({VEHICLE_LEAD_TIMES[type]?.minutes}m)
                  </option>
                ))}
              </select>

              {/* Filter Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="MENUNGGU_VERIFIKASI_PO">Menunggu PO</option>
                <option value="WAITING_DOCK_QUEUE">Antri Mundur</option>
                <option value="PO_READY_DOCK_ASSIGNED">Ready Dock</option>
                <option value="SEDANG_BONGKAR">Sedang Bongkar</option>
                <option value="SELESAI_BONGKAR">Selesai Bongkar</option>
                <option value="CANCELLED">🚫 Dibatalkan / Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 underline decoration-blue-500 decoration-2 underline-offset-4 text-sm">
                Antrean &amp; Status Proses Bongkaran
              </h3>
              <span className="text-xs text-slate-500 font-mono">{filteredRecords.length} Data Terpilih</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-white text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 font-bold">
                  <tr>
                    <th 
                      onClick={() => {
                        setSortField('queueNumber');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="px-4 py-3 cursor-pointer hover:text-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        <span>Antrean</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th 
                      onClick={() => {
                        setSortField('supplierName');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="px-4 py-3 cursor-pointer hover:text-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        <span>Supplier &amp; Plat</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3">Kendaraan</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">T1 Masuk</th>
                    <th className="px-4 py-3">T3 Mulai</th>
                    <th className="px-4 py-3">T4 Selesai</th>
                    <th className="px-4 py-3">Durasi</th>
                    <th 
                      onClick={() => {
                        setSortField('variance');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="px-4 py-3 cursor-pointer hover:text-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        <span>Status Lead Time</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada data antrean yang sesuai dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => {
                      const analysis = calculateLeadTime(rec, currentTime);
                      const isOverdue = analysis.isOverdue;

                      return (
                        <tr 
                          key={rec.id} 
                          className={`hover:bg-blue-50/30 transition-colors ${
                            isOverdue && rec.status === 'SEDANG_BONGKAR' ? 'bg-red-50/40' : ''
                          }`}
                        >
                          {/* No Antrean */}
                          <td className="px-4 py-3.5 font-mono font-extrabold text-blue-600">
                            {rec.queueNumber}
                          </td>

                          {/* Supplier & Plat */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{rec.supplierName}</div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center flex-wrap gap-1">
                              <span>{rec.licensePlate} •</span>
                              <span className="font-semibold text-blue-600">{rec.assignedDock || 'No Dock'}</span>
                              {rec.zoneChangeRequest?.status === 'PENDING' && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300 animate-pulse">
                                  Req SPV: {rec.zoneChangeRequest.requestedZone}
                                </span>
                              )}
                              {rec.zoneChangeRequest?.status === 'APPROVED' && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                  Relokasi ACC
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Kendaraan (Lead Time) */}
                          <td className="px-4 py-3.5">
                            <div className="text-slate-800">{rec.vehicleType}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Std: {analysis.standardMinutes}m
                            </div>
                          </td>

                          {/* Driver */}
                          <td className="px-4 py-3.5">
                            <div className="text-slate-800">{rec.driverName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{rec.driverPhone || '-'}</div>
                          </td>

                          {/* Jam Masuk (T1) */}
                          <td className="px-4 py-3.5 font-mono text-slate-600">
                            {formatShortTime(rec.t1GateIn)}
                          </td>

                          {/* Jam Mulai (T3) */}
                          <td className="px-4 py-3.5 font-mono text-slate-600">
                            {formatShortTime(rec.t3UnloadingStart)}
                          </td>

                          {/* Jam Selesai (T4) */}
                          <td className="px-4 py-3.5 font-mono text-slate-600">
                            {formatShortTime(rec.t4UnloadingFinish)}
                          </td>

                          {/* Total Durasi (T4-T3 or Live) */}
                          <td className="px-4 py-3.5">
                            {rec.t3UnloadingStart ? (
                              <div>
                                <span className={`font-mono font-bold ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                                  {formatDuration(analysis.actualUnloadingMinutes)}
                                </span>
                                {rec.status === 'SEDANG_BONGKAR' && (
                                  <span className="text-[10px] text-blue-600 block font-sans">
                                    (Live)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Status Lead Time (🟢 On-Time / 🔴 Overdue) */}
                          <td className="px-4 py-3.5">
                            {rec.t3UnloadingStart ? (
                              isOverdue ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700">
                                  Overdue (+{analysis.varianceMinutes}m)
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                                  On-Time
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 text-xs">Menunggu T3</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              rec.status === 'MENUNGGU_VERIFIKASI_PO'
                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                : rec.status === 'WAITING_DOCK_QUEUE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : rec.status === 'PO_READY_DOCK_ASSIGNED'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : rec.status === 'SEDANG_BONGKAR'
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : rec.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}>
                              {rec.status === 'MENUNGGU_VERIFIKASI_PO' ? 'Menunggu PO' :
                               rec.status === 'WAITING_DOCK_QUEUE' ? 'Antri Mundur' :
                               rec.status === 'PO_READY_DOCK_ASSIGNED' ? 'Ready Dock' :
                               rec.status === 'SEDANG_BONGKAR' ? 'Bongkar' :
                               rec.status === 'CANCELLED' ? 'Dibatalkan' : 'Selesai'}
                            </span>
                          </td>

                          {/* Action Modal & SPV Cancel */}
                          <td className="px-4 py-3.5 text-right print:hidden">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedRecord(rec)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                                title="Lihat Detail & Audit Trail"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Audit</span>
                              </button>
                              {rec.status !== 'SELESAI_BONGKAR' && rec.status !== 'FINISHED' && rec.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancellingRecord(rec);
                                    setCancelReasonOption('Input kedobel dari security');
                                    setCustomReasonText('');
                                    setCancelNotes('');
                                  }}
                                  className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                  title="Batalkan Bongkaran Armada Ini"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span className="hidden sm:inline">Batalkan</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR DIBATALKAN / CANCELLED (SPV ARCHIVE) */}
      {activeTab === 'cancelled_list' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-rose-100 bg-rose-50/60 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-rose-100 text-rose-700">
                  <Ban className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-rose-950 text-sm sm:text-base">
                    Daftar Armada Dibatalkan (Cancelled)
                  </h3>
                  <p className="text-xs text-rose-800">
                    Arsip armada yang dibatalkan oleh Supervisor beserta alasan pembatalan dan riwayat pencatatan.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
                Total: {cancelledRecords.length} Armada Dibatalkan
              </span>
            </div>

            {cancelledRecords.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Tidak Ada Armada Dibatalkan</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Semua armada bongkaran beroperasi normal dan belum ada pembatalan armada pada periode filter yang dipilih.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono text-[11px]">
                      <th className="px-4 py-3 font-semibold">No. Antrean &amp; Status</th>
                      <th className="px-4 py-3 font-semibold">Supplier / Kendaraan</th>
                      <th className="px-4 py-3 font-semibold">Driver &amp; Plat</th>
                      <th className="px-4 py-3 font-semibold">Waktu Masuk &amp; Batal</th>
                      <th className="px-4 py-3 font-semibold">Alasan Pembatalan</th>
                      <th className="px-4 py-3 font-semibold">Catatan Detail</th>
                      <th className="px-4 py-3 font-semibold">Dibatalkan Oleh</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {cancelledRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-rose-50/30 transition">
                        {/* No. Antrean & Status */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <span className="font-mono font-black text-sm text-slate-900 block">
                              {rec.queueNumber}
                            </span>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                              Dibatalkan
                            </span>
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block text-xs">{rec.supplierName}</span>
                          <span className="text-[11px] text-slate-500">{rec.vehicleType}</span>
                        </td>

                        {/* Driver & Plat */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-semibold text-slate-800 block text-xs">{rec.licensePlate}</span>
                          <span className="text-[11px] text-slate-500">{rec.driverName}</span>
                        </td>

                        {/* Waktu */}
                        <td className="px-4 py-3.5 font-mono text-[11px] space-y-0.5">
                          <div className="text-slate-600">
                            <span className="text-slate-400">Masuk:</span> {formatDateTime(rec.t1GateIn)}
                          </div>
                          <div className="text-rose-700 font-bold">
                            <span className="text-rose-400 font-normal">Batal:</span> {rec.cancelledAt || '-'}
                          </div>
                        </td>

                        {/* Alasan Pembatalan */}
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200">
                            {rec.cancelReason || 'Dibatalkan tanpa alasan'}
                          </span>
                        </td>

                        {/* Catatan Tambahan */}
                        <td className="px-4 py-3.5 text-xs text-slate-600 italic max-w-xs">
                          {rec.cancelNotes ? `"${rec.cancelNotes}"` : '-'}
                        </td>

                        {/* Dibatalkan Oleh */}
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                          👤 {rec.cancelledBy || 'Supervisor'}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                            title="Lihat Detail & Audit Trail"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Audit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORICAL REPORT & ANALYTICS (LEAD TIME VARIANCE ANALYSIS) */}
      {activeTab === 'analytics_report' && (
        <div className="space-y-6">
          {/* Top Analytics Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Condition Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  Kondisi Fisik Barang Masuk
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {analyticsData.goodsConditionStats.totalCompleted} Truk Selesai
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-700 font-mono">
                    {analyticsData.goodsConditionStats.sesuaiCount}
                  </p>
                  <p className="text-[11px] text-slate-600 font-semibold mt-1">Sesuai (OK)</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-2xl font-bold text-amber-700 font-mono">
                    {analyticsData.goodsConditionStats.selisihCount}
                  </p>
                  <p className="text-[11px] text-slate-600 font-semibold mt-1">Selisih Qty</p>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <p className="text-2xl font-bold text-rose-700 font-mono">
                    {analyticsData.goodsConditionStats.rusakCount}
                  </p>
                  <p className="text-[11px] text-slate-600 font-semibold mt-1">Rusak/Cacat</p>
                </div>
              </div>
            </div>

            {/* Average Duration Stats */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Rata-rata Durasi Bongkar
              </h4>
              <div className="pt-2">
                <p className="text-3xl font-extrabold text-blue-600 font-mono">
                  {stats.avgDurationMinutes} Menit
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Rata-rata waktu proses bongkar fisik (T4 - T3) hari ini.
                </p>
              </div>
            </div>

            {/* SLA On-Time Rate */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                On-Time Lead Time SLA
              </h4>
              <div className="pt-2">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-emerald-600 font-mono">
                    {stats.onTimeRate}%
                  </p>
                  <span className="text-xs text-slate-500">Kepatuhan Lead Time</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden mt-3">
                  <div 
                    className="h-full bg-emerald-500"
                    style={{ width: `${stats.onTimeRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lead Time Variance Analysis per Vehicle Type Table & Visual Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-base">
                  Analisis Variansi Lead Time per Jenis Armada (Actual vs SOP)
                </h4>
                <p className="text-xs text-slate-500">
                  Perbandingan waktu bongkar aktual (T4 - T3) vs standar lead time armada supplier.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-blue-700 font-bold font-mono">
                Formula: (T4 - T3) vs Std
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {STANDARD_VEHICLE_TYPES.map((type) => {
                const info = VEHICLE_LEAD_TIMES[type];
                const statsForVehicle = analyticsData.vehicleCounts[type] || { total: 0, onTime: 0, overdue: 0, avgActualMinutes: info.minutes };
                const variance = statsForVehicle.avgActualMinutes - info.minutes;
                const isOverdue = variance > 0;

                return (
                  <div key={type} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{type}</span>
                        <span className="text-xs text-slate-500 font-mono">({info.capacity})</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
                          {statsForVehicle.total} Unit Terdaftar
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-400">Standar SOP: </span>
                          <strong className="text-slate-700">{info.minutes}m</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Rata-rata Aktual: </span>
                          <strong className={isOverdue ? 'text-red-600' : 'text-emerald-700'}>
                            {statsForVehicle.avgActualMinutes}m
                          </strong>
                        </div>
                        <div className={`px-2 py-0.5 rounded font-bold ${
                          isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {variance > 0 ? `+${variance}m (Overdue)` : `${variance}m (Efisiensi)`}
                        </div>
                      </div>
                    </div>

                    {/* Comparative Lead Time Bar */}
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-500 ${isOverdue ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, Math.round((statsForVehicle.avgActualMinutes / (info.minutes * 1.5)) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pembatalan Bongkaran (Otoritas SPV) */}
      {cancellingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Konfirmasi Pembatalan Bongkaran
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold">
                    Khusus Otoritas Supervisor (SPV)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCancellingRecord(null);
                  setCancelReasonOption('Input kedobel dari security');
                  setCustomReasonText('');
                  setCancelNotes('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ringkasan Armada */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ringkasan Armada yang Akan Dibatalkan
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 text-[11px] block">No. Antrean:</span>
                  <span className="font-mono font-black text-blue-700 text-sm">{cancellingRecord.queueNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">No. Polisi:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{cancellingRecord.licensePlate}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Supplier:</span>
                  <span className="font-bold text-slate-900 text-xs">{cancellingRecord.supplierName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Jenis &amp; Driver:</span>
                  <span className="text-slate-700 text-xs font-medium">{cancellingRecord.vehicleType} • {cancellingRecord.driverName}</span>
                </div>
              </div>
            </div>

            {/* Pilihan Alasan Utama */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Alasan Utama Pembatalan: <span className="text-rose-600">*</span>
              </label>
              <div className="space-y-1.5">
                {[
                  'Input kedobel dari security',
                  'Barang ditolak semua',
                  'Supplier salah alamat bongkar',
                  'Lainnya (Tulis alasan)'
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      cancelReasonOption === reason
                        ? 'border-rose-300 bg-rose-50/70 text-rose-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReasonOption"
                      value={reason}
                      checked={cancelReasonOption === reason}
                      onChange={() => setCancelReasonOption(reason)}
                      className="accent-rose-600 cursor-pointer"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {cancelReasonOption === 'Lainnya (Tulis alasan)' && (
                <div className="pt-1 animate-in fade-in">
                  <input
                    type="text"
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Tulis alasan spesifik pembatalan..."
                    className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-900 placeholder-slate-400"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Catatan Tambahan (Opsional) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Catatan Tambahan (Opsional):
              </label>
              <textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Catatan tambahan untuk arsip audit dan log supervisor..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 resize-none"
              />
            </div>

            {/* Note */}
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-tight">
              ⚠️ <strong>Pemberitahuan:</strong> Armada yang dibatalkan akan otomatis dieksklusi dari perhitungan antrean aktif, total kedatangan hari ini, dan laporan SLA.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancellingRecord(null);
                  setCancelReasonOption('Input kedobel dari security');
                  setCustomReasonText('');
                  setCancelNotes('');
                }}
                disabled={isSubmittingCancel}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Tutup / Batal
              </button>
              <button
                type="button"
                id="btn-spv-confirm-cancel"
                disabled={isSubmittingCancel || (cancelReasonOption === 'Lainnya (Tulis alasan)' && !customReasonText.trim())}
                onClick={async () => {
                  if (!cancellingRecord) return;
                  const finalReason = cancelReasonOption === 'Lainnya (Tulis alasan)' 
                    ? (customReasonText.trim() || 'Alasan lainnya') 
                    : cancelReasonOption;

                  try {
                    setIsSubmittingCancel(true);
                    await cancelRecord(
                      cancellingRecord.id,
                      finalReason,
                      cancelNotes.trim() || undefined,
                      authUser?.name || 'Supervisor WH CKL'
                    );
                    setActionToast(`Armada ${cancellingRecord.queueNumber} (${cancellingRecord.supplierName}) berhasil dibatalkan.`);
                    setTimeout(() => setActionToast(null), 5000);
                    setCancellingRecord(null);
                    setCancelReasonOption('Input kedobel dari security');
                    setCustomReasonText('');
                    setCancelNotes('');
                  } catch (err) {
                    console.error(err);
                    alert('Gagal membatalkan armada.');
                  } finally {
                    setIsSubmittingCancel(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingCancel ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>🚫 Konfirmasi Batalkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Storage & Sync Center Modal */}
      <GoogleDriveModal 
        isOpen={isGoogleDriveOpen} 
        onClose={() => setIsGoogleDriveOpen(false)} 
      />

      {/* Reset / Clear All Data Across Devices Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                Reset / Kosongkan Seluruh Data Antrean?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan <strong>menghapus seluruh antrean &amp; riwayat bongkar muat pada server</strong> secara permanen. Perubahan akan langsung disinkronkan serentak ke <strong>semua perangkat yang terhubung (PC, Tablet, &amp; Mobile)</strong>.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Nomor antrean berikutnya akan dimulai kembali dari <strong>#Q-001</strong>.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                disabled={isClearing}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-clear-all-devices"
                disabled={isClearing}
                onClick={async () => {
                  try {
                    setIsClearing(true);
                    await clearAllData();
                    setIsClearConfirmOpen(false);
                  } finally {
                    setIsClearing(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengosongkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Kosongkan Semua Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

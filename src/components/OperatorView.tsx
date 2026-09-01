import React, { useState, useRef } from 'react';
import { 
  HardHat, 
  Play, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  ArrowRight,
  ArrowLeft,
  Filter,
  UserCheck,
  Home,
  LogOut,
  User,
  Camera,
  Upload,
  X,
  Send,
  FileCheck,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { formatShortTime, formatDateTime, calculateLeadTime, formatDuration } from '../utils/timeUtils';
import { UnloadingRecord, WAREHOUSE_ZONES } from '../types';

export const OperatorView: React.FC = () => {
  const { 
    records, 
    startUnloading, 
    operatorFinishUnloading,
    currentTime, 
    setActiveRole, 
    setSelectedRecord,
    returnToPortal,
    logout,
    authUser
  } = useWarehouse();

  const [operatorName, setOperatorName] = useState(authUser?.name || 'Tim Dock Alpha (3 Orang)');
  const [selectedDockFilter, setSelectedDockFilter] = useState('ALL');

  // Modal State for Operator Finish Unload
  const [finishingRecord, setFinishingRecord] = useState<UnloadingRecord | null>(null);
  const [operatorNotesInput, setOperatorNotesInput] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trucks that are PO Ready (Ready to click Mulai Bongkar T3)
  const readyList = records.filter(r => r.status === 'PO_READY_DOCK_ASSIGNED');
  // Trucks currently actively unloading (Started T3, running timer)
  const activeUnloadingList = records.filter(r => r.status === 'SEDANG_BONGKAR');
  // Trucks finished by operator, waiting admin verification
  const waitingAdminList = records.filter(
    r => r.status === 'WAITING_ADMIN_VERIFICATION' || r.status === 'MENUNGGU_VERIFIKASI_ADMIN'
  );

  // Filtered lists
  const filteredReady = readyList.filter(r => {
    if (selectedDockFilter === 'ALL') return true;
    return (r.assignedDock || '').toLowerCase().includes(selectedDockFilter.toLowerCase());
  });

  const filteredActive = activeUnloadingList.filter(r => {
    if (selectedDockFilter === 'ALL') return true;
    return (r.assignedDock || '').toLowerCase().includes(selectedDockFilter.toLowerCase());
  });

  const handleStartBongkar = (rec: UnloadingRecord) => {
    startUnloading(rec.id, operatorName);
  };

  const handleOpenFinishModal = (rec: UnloadingRecord) => {
    setFinishingRecord(rec);
    setOperatorNotesInput('');
    setUploadedPhotos([]);
  };

  const handleAddSamplePhoto = () => {
    const samples = [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=60',
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setUploadedPhotos(prev => [...prev, picked]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmitFinishUnload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finishingRecord) return;

    setIsSubmitting(true);
    try {
      operatorFinishUnloading(finishingRecord.id, {
        operatorName,
        operatorNotes: operatorNotesInput,
        photos: uploadedPhotos,
      });

      const queueNum = finishingRecord.queueNumber;
      setFinishingRecord(null);
      setSuccessToast(`Bongkaran antrean ${queueNum} berhasil diselesaikan! Status diteruskan ke Admin Gudang.`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim verifikasi ke admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dockFilters = ['ALL', ...WAREHOUSE_ZONES];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button 
            onClick={() => setSuccessToast(null)} 
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
              <HardHat className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 font-mono">
              OPERATOR LOADING DOCK INTERFACE
            </span>
            {authUser && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                👤 {authUser.name}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            Eksekusi Proses Bongkaran Truk (T3 &amp; Selesai Bongkar)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Interface cepat kru dock. Tekan Mulai Bongkar saat armada merapat, lalu tekan Finish Unload setelah fisik muatan selesai dibongkar.
          </p>
        </div>

        {/* Operator Profile Selector & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <UserCheck className="w-4 h-4 text-orange-600 shrink-0" />
            <div className="space-y-0.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                Regu / Kru Aktif
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
            title="Logout Operator"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dock Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter Dock:
        </span>
        {dockFilters.map((dock) => (
          <button
            key={dock}
            onClick={() => setSelectedDockFilter(dock)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedDockFilter === dock
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {dock === 'ALL' ? 'Semua Dock' : dock}
          </button>
        ))}
      </div>

      {/* SECTION 1: TRUCKS READY FOR UNLOADING (PO READY -> CLICK T3) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Antrean Siap Bongkar / Dock Assigned ({filteredReady.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 hidden sm:block">
            Klik tombol besar &quot;Mulai Bongkar&quot; untuk mencatat T3
          </span>
        </div>

        {filteredReady.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2">
            <Truck className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Tidak ada antrean truk berstatus &quot;PO Ready&quot; saat ini.
            </p>
            <p className="text-xs text-slate-500">
              Admin Gudang akan memverifikasi dokumen dan mengalokasikan dock terlebih dahulu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReady.map((rec) => {
              const leadAnalysis = calculateLeadTime(rec, currentTime);
              return (
                <div
                  key={rec.id}
                  className="bg-white border-2 border-blue-200 hover:border-blue-400 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-black px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                        {rec.queueNumber}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {rec.assignedDock || 'Dock -'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{rec.supplierName}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-600">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {rec.licensePlate}
                        </span>
                        <span>{rec.driverName}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jenis Kendaraan:</span>
                        <span className="font-bold text-blue-600">{rec.vehicleType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Standar Durasi SOP:</span>
                        <span className="font-mono text-orange-600 font-bold">{leadAnalysis.standardMinutes} Menit</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">No PO PPIC:</span>
                        <span className="font-mono text-slate-700">{rec.poNumber || '-'}</span>
                      </div>
                      {rec.adminNotesStep1 && (
                        <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
                          Catatan Admin: &quot;{rec.adminNotesStep1}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleStartBongkar(rec)}
                      id={`btn-mulai-bongkar-${rec.id}`}
                      className="w-full py-3.5 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-sm flex items-center justify-center gap-3 transition cursor-pointer active:scale-[0.98]"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>▶ MULAI BONGKAR (T3)</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-1.5 font-medium">
                      Catat waktu mulai dan aktifkan timer real-time.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: CURRENTLY ACTIVE UNLOADING (LIVE RUNNING COUNTDOWN & FINISH UNLOAD ACTION) */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Sedang Dalam Proses Bongkaran ({filteredActive.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 hidden sm:block">
            Tekan &quot;Finish Unload&quot; saat pengerjaan fisik selesai untuk kirim verifikasi ke Admin
          </span>
        </div>

        {filteredActive.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 text-xs">
            Tidak ada aktivitas bongkar fisik yang sedang berjalan saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredActive.map((rec) => {
              const leadAnalysis = calculateLeadTime(rec, currentTime);
              const isOverdue = leadAnalysis.isOverdue;

              return (
                <div
                  key={rec.id}
                  className={`rounded-xl p-5 border shadow-sm space-y-4 transition bg-white ${
                    isOverdue
                      ? 'border-red-300 ring-1 ring-red-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800">
                        {rec.queueNumber}
                      </span>
                      <span className="text-xs font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50">
                        {rec.assignedDock}
                      </span>
                    </div>

                    {isOverdue ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>OVERDUE (+{leadAnalysis.varianceMinutes} Menit)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ON-TRACK</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{rec.supplierName}</h4>
                    <p className="text-xs font-mono text-slate-600 mt-0.5">
                      {rec.licensePlate} • {rec.driverName} • {rec.vehicleType}
                    </p>
                  </div>

                  {/* Big Live Timer Card */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center space-y-2">
                    <p className="text-xs text-slate-500 font-semibold">Durasi Bongkar Berjalan (Live)</p>
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-wider flex items-center justify-center gap-2">
                      <Clock className={`w-7 h-7 ${isOverdue ? 'text-red-500 animate-spin' : 'text-blue-600'}`} />
                      <span className={isOverdue ? 'text-red-600' : 'text-emerald-600'}>
                        {formatDuration(leadAnalysis.actualUnloadingMinutes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                      <span>Mulai (T3): <strong className="text-slate-800 font-mono">{formatShortTime(rec.t3UnloadingStart)}</strong></span>
                      <span>Target SOP: <strong className="text-orange-600 font-mono">{leadAnalysis.standardMinutes} Menit</strong></span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isOverdue ? 'bg-red-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, leadAnalysis.progressPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Operator Actions: Finish Unload / Selesai Bongkar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedRecord(rec)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold transition cursor-pointer"
                    >
                      Lihat Dokumen
                    </button>
                    <button
                      onClick={() => handleOpenFinishModal(rec)}
                      id={`btn-finish-unload-${rec.id}`}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finish Unload / Selesai Bongkar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: TRUCKS WAITING ADMIN VERIFICATION (T4 OPERATOR FINISHED) */}
      {waitingAdminList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Menunggu Verifikasi &amp; Pengecekan Admin ({waitingAdminList.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 hidden sm:block">
              Bongkar fisik telah diselesaikan oleh Operator, menunggu admin menutup dokumen
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {waitingAdminList.map((rec) => {
              const leadAnalysis = calculateLeadTime(rec, currentTime);
              return (
                <div
                  key={rec.id}
                  className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-800">
                      {rec.queueNumber}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200">
                      {rec.assignedDock}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{rec.supplierName}</h4>
                    <p className="text-xs font-mono text-slate-600 mt-0.5">
                      {rec.licensePlate} • {rec.driverName}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-amber-100 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Selesai Operator (T4 Op):</span>
                      <span className="font-mono font-bold text-slate-800">{formatShortTime(rec.t4Operator)} WIB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Durasi Pengerjaan:</span>
                      <span className="font-mono font-bold text-emerald-700">{formatDuration(leadAnalysis.actualUnloadingMinutes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Petugas Operator:</span>
                      <span className="text-slate-700 font-medium">{rec.operatorName || '-'}</span>
                    </div>
                    {rec.operatorPhotos && rec.operatorPhotos.length > 0 && (
                      <div className="pt-1 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{rec.operatorPhotos.length} Foto Terlampir ke Admin</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-amber-700 font-bold">
                      ⏳ Menunggu Admin Gudang
                    </span>
                    <button
                      onClick={() => setSelectedRecord(rec)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Detail Dokumen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMATION FINISH UNLOAD & PHOTO UPLOAD */}
      {finishingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Konfirmasi Selesai Bongkar Fisik</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {finishingRecord.queueNumber} - {finishingRecord.supplierName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFinishingRecord(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFinishUnload} className="space-y-4 text-xs sm:text-sm">
              {/* Truck Details Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Armada &amp; Plat:</span>
                    <span className="text-slate-900 font-bold font-mono">
                      {finishingRecord.vehicleType} ({finishingRecord.licensePlate})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pintu Dock:</span>
                    <span className="text-blue-700 font-bold font-mono">{finishingRecord.assignedDock}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Waktu Mulai Bongkar (T3):</span>
                    <span className="text-slate-800 font-mono font-bold">
                      {formatShortTime(finishingRecord.t3UnloadingStart)} WIB
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Durasi Pengerjaan:</span>
                    <span className="text-emerald-600 font-mono font-bold">
                      {formatDuration(calculateLeadTime(finishingRecord, currentTime).actualUnloadingMinutes)}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Petugas / Regu Bongkar:</span>
                  <span className="text-slate-800 font-bold">{operatorName}</span>
                </div>
              </div>

              {/* Optional Photo Upload: Foto Kondisi Barang / Dokumen Fisik */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Foto Kondisi Barang / Dokumen Fisik <span className="text-slate-400 font-normal">(Opsional)</span></span>
                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" /> + Foto Sampel
                  </button>
                </label>

                {uploadedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 py-1">
                    {uploadedPhotos.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Proof ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow cursor-pointer hover:bg-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition active:scale-[0.99]"
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Ambil Foto Kamera / Unggah Dokumen Fisik</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Catatan / Keterangan Operator */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Catatan dari Operator / Kru Dock <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  value={operatorNotesInput}
                  onChange={(e) => setOperatorNotesInput(e.target.value)}
                  placeholder="Contoh: Muatan 100 pallet telah selesai diturunkan di Bay A. Kondisi rapi."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFinishingRecord(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-submit-kirim-admin"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Verifikasi ke Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

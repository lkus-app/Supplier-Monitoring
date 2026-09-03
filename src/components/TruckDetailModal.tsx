import React, { useState } from 'react';
import { 
  X, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Phone, 
  FileText, 
  HardHat, 
  Image as ImageIcon, 
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  ClipboardCheck,
  PackageCheck,
  HardDrive,
  FolderOpen,
  Ban,
  Maximize2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { formatDateTime, formatDuration, calculateLeadTime } from '../utils/timeUtils';

export const TruckDetailModal: React.FC = () => {
  const { selectedRecord, setSelectedRecord, currentTime } = useWarehouse();
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!selectedRecord) return null;

  const analysis = calculateLeadTime(selectedRecord, currentTime);
  const isOverdue = analysis.isOverdue;

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI_PO':
        return { label: 'T1: MENUNGGU VERIFIKASI PO', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'WAITING_DOCK_QUEUE':
        return { label: 'ANTRI MUNDUR / HOLD DOCK', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'PO_READY_DOCK_ASSIGNED':
        return { label: 'T2: SIAP BONGKAR (DOCK ASSIGNED)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SEDANG_BONGKAR':
        return { label: 'T3: SEDANG BONGKAR FISIK', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'WAITING_ADMIN_VERIFICATION':
      case 'MENUNGGU_VERIFIKASI_ADMIN':
        return { label: 'MENUNGGU VERIFIKASI FINAL', bg: 'bg-amber-50 text-amber-900 border-amber-300' };
      case 'CANCELLED':
        return { label: 'DIBATALKAN / CANCELLED', bg: 'bg-rose-100 text-rose-700 border-rose-300' };
      case 'SELESAI_BONGKAR':
      case 'FINISHED':
      case 'COMPLETED':
      default:
        return { label: 'T4: SELESAI BONGKAR', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const statusInfo = getStatusBadge(selectedRecord.status);

  // Folder & link Google Drive
  const driveQueueFolder = selectedRecord.queueNumber ? selectedRecord.queueNumber.replace('#', '') : '';
  const driveWebUrl = selectedRecord.fileUrls?.googleDriveFolderUrl || selectedRecord.googleDriveFolderUrl;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        {/* Main Modal Container: max-w-2xl / sm:max-w-3xl, max-h-[90vh], flex flex-col */}
        <div 
          className="bg-white border border-slate-200 rounded-2xl max-w-2xl sm:max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-modal-title"
        >
          {/* =======================================================
              1. MODAL HEADER (Sticky di atas)
             ======================================================= */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 bg-slate-50/90 shrink-0 flex items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span id="audit-modal-title" className="font-mono font-black text-base sm:text-lg text-blue-800 tracking-tight">
                    {selectedRecord.queueNumber}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap ${statusInfo.bg}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 truncate mt-0.5">
                  <span className="font-bold text-slate-900 truncate">{selectedRecord.supplierName}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-700 shrink-0">{selectedRecord.licensePlate}</span>
                  {selectedRecord.assignedDock && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-emerald-700 shrink-0">{selectedRecord.assignedDock}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-200/70 transition cursor-pointer shrink-0"
              title="Tutup Modal"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* =======================================================
              2. MODAL BODY (Scrollable flex-1 p-4 sm:p-5 space-y-4)
             ======================================================= */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4 divide-y-0 text-slate-800">
            {/* Cancellation Notice Banner (Jika Dibatalkan) */}
            {selectedRecord.status === 'CANCELLED' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-rose-100 text-rose-700 shrink-0">
                    <Ban className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-rose-900 text-xs sm:text-sm">Bongkaran Dibatalkan oleh Supervisor</h4>
                    <p className="text-[11px] text-rose-700">Armada dibatalkan dari proses antrean dan tidak dihitung ke SLA normal.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/90 p-2.5 rounded-lg border border-rose-200">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Alasan Pembatalan:</span>
                    <span className="font-bold text-rose-700 text-xs block mt-0.5">{selectedRecord.cancelReason || 'Dibatalkan'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Waktu Dibatalkan:</span>
                    <span className="font-mono text-slate-700 text-xs block mt-0.5">{selectedRecord.cancelledAt || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Oleh Supervisor:</span>
                    <span className="font-bold text-slate-900 text-xs block mt-0.5">{selectedRecord.cancelledBy || 'Supervisor'}</span>
                  </div>
                  {selectedRecord.cancelNotes && (
                    <div className="col-span-full border-t border-rose-100 pt-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-semibold block">Catatan Tambahan:</span>
                      <span className="text-slate-800 italic block mt-0.5">&quot;{selectedRecord.cancelNotes}&quot;</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* A. Ringkasan KPI Lead Time (Grid Kompak) */}
            <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium block">Jenis Armada</span>
                <span className="text-sm sm:text-base font-bold text-slate-800 mt-0.5 block truncate" title={selectedRecord.vehicleType}>
                  {selectedRecord.vehicleType}
                </span>
              </div>

              <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium block">Standar SOP</span>
                <span className="text-sm sm:text-base font-bold font-mono text-orange-600 mt-0.5 block">
                  {analysis.standardMinutes} m
                </span>
              </div>

              <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium block">Durasi Aktual</span>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-800 mt-0.5 block">
                  {formatDuration(analysis.actualUnloadingMinutes)}
                </span>
              </div>

              <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium block">Status Lead Time</span>
                <span className={`text-sm sm:text-base font-bold mt-0.5 block ${
                  isOverdue ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {isOverdue ? `Overdue (+${analysis.varianceMinutes}m)` : `On-Time (${analysis.varianceMinutes}m)`}
                </span>
              </div>
            </div>

            {/* B. Milestone Audit Trail (T1 - T4: Rapat & Bersih) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Riwayat Milestone &amp; Audit Trail Serah Terima
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">T1 s/d T4</span>
              </div>

              <div className="relative pl-6 space-y-2.5 sm:space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Step 1: Security Gate In (T1) */}
                <div className="relative space-y-0.5">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold shadow-xs">
                    1
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      T1: Kedatangan Pintu Gerbang (Security)
                    </span>
                    <span className="text-xs font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {formatDateTime(selectedRecord.t1GateIn)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Driver: <strong className="text-slate-800">{selectedRecord.driverName}</strong> ({selectedRecord.licensePlate})
                    {selectedRecord.driverPhone && ` • Tel: ${selectedRecord.driverPhone}`}
                    {selectedRecord.suratJalanNumber && ` • No. SJ: ${selectedRecord.suratJalanNumber}`}
                  </p>
                </div>

                {/* Step 2: Admin Gudang PO Ready (T2) */}
                <div className="relative space-y-0.5">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold shadow-xs ${
                    selectedRecord.t2PoReady ? 'bg-orange-500' : 'bg-slate-300 text-slate-500'
                  }`}>
                    2
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      T2: Verifikasi Dokumen &amp; Cek PO PPIC
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      selectedRecord.t2PoReady 
                        ? 'text-orange-700 bg-orange-50 border-orange-200' 
                        : 'text-slate-400 bg-slate-100 border-slate-200'
                    }`}>
                      {selectedRecord.t2PoReady ? formatDateTime(selectedRecord.t2PoReady) : 'Menunggu Verifikasi'}
                    </span>
                  </div>
                  {selectedRecord.t2PoReady ? (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>
                        No PO: <strong className="text-slate-900 font-mono">{selectedRecord.poNumber || '-'}</strong> • 
                        Lokasi: <strong className="text-emerald-700 font-mono">{selectedRecord.assignedDock || '-'}</strong>
                        {selectedRecord.adminNameStep1 && ` • Admin: ${selectedRecord.adminNameStep1}`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Waktu Tunggu Cek Dokumen (T2 - T1): <strong className="text-slate-600 font-mono">{analysis.waitingPoMinutes} Menit</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Menunggu verifikasi admin gudang.</p>
                  )}
                </div>

                {/* Step 3: Operator Start Unloading (T3) */}
                <div className="relative space-y-0.5">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold shadow-xs ${
                    selectedRecord.t3UnloadingStart ? 'bg-purple-600' : 'bg-slate-300 text-slate-500'
                  }`}>
                    3
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      T3: Mulai Eksekusi Bongkaran Fisik (Operator)
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      selectedRecord.t3UnloadingStart 
                        ? 'text-purple-700 bg-purple-50 border-purple-200' 
                        : 'text-slate-400 bg-slate-100 border-slate-200'
                    }`}>
                      {selectedRecord.t3UnloadingStart ? formatDateTime(selectedRecord.t3UnloadingStart) : 'Belum Dimulai'}
                    </span>
                  </div>
                  {selectedRecord.t3UnloadingStart ? (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>
                        Petugas: <strong className="text-slate-800">{selectedRecord.operatorName || 'Kru Dock'}</strong>
                        {selectedRecord.t4Operator && ` • Selesai Bongkar Kru: ${formatDateTime(selectedRecord.t4Operator)}`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Waktu Antre Sebelum Bongkar (T3 - T2): <strong className="text-slate-600 font-mono">{analysis.waitingStartMinutes} Menit</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Menunggu operator memulai proses bongkaran.</p>
                  )}
                </div>

                {/* Step 4: Finalization Unloading (T4) */}
                <div className="relative space-y-0.5">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold shadow-xs ${
                    selectedRecord.t4UnloadingFinish ? 'bg-emerald-600' : 'bg-slate-300 text-slate-500'
                  }`}>
                    4
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      T4: Verifikasi Final &amp; Validasi Fisik Selesai
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      selectedRecord.t4UnloadingFinish 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                        : 'text-slate-400 bg-slate-100 border-slate-200'
                    }`}>
                      {selectedRecord.t4UnloadingFinish ? formatDateTime(selectedRecord.t4UnloadingFinish) : 'Dalam Proses'}
                    </span>
                  </div>
                  {selectedRecord.t4UnloadingFinish ? (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>
                        Manpower: <strong className="text-slate-800">{selectedRecord.operatorCount || 1} Orang</strong> • 
                        Kondisi: <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] inline-block ${
                          selectedRecord.goodsCondition === 'Sesuai' ? 'bg-emerald-100 text-emerald-800' :
                          selectedRecord.goodsCondition === 'Selisih' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>{selectedRecord.goodsCondition || 'Sesuai'}</span>
                        {selectedRecord.adminNameStep2 && ` • Admin: ${selectedRecord.adminNameStep2}`}
                      </p>
                      {selectedRecord.adminFinalNotes && (
                        <p className="text-[11px] text-slate-600 italic">
                          Catatan: &quot;{selectedRecord.adminFinalNotes}&quot;
                        </p>
                      )}
                      <p className="text-[11px] text-emerald-800 font-bold pt-0.5">
                        Total Turnaround (T1 s/d Selesai): <span className="font-mono">{formatDuration(analysis.totalTurnaroundMinutes)}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Bongkaran fisik sedang diproses atau menunggu finalisasi admin.</p>
                  )}
                </div>
              </div>
            </div>

            {/* C. Lampiran Foto Surat Jalan & Bukti Fisik (Thumbnail Kompak + Fallback) */}
            {(selectedRecord.suratJalanPhoto || (selectedRecord.goodsPhotos && selectedRecord.goodsPhotos.length > 0)) && (
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    Lampiran Foto Dokumen &amp; Kondisi Barang
                  </h4>
                  <span className="text-[11px] text-slate-400">Klik untuk perbesar</span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {/* Foto Surat Jalan */}
                  {selectedRecord.suratJalanPhoto && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">
                        Surat Jalan
                      </span>
                      {imageErrors['surat_jalan'] ? (
                        <div className="w-32 h-24 sm:w-40 sm:h-28 rounded-lg border border-slate-200 bg-slate-100 flex flex-col items-center justify-center p-2 text-center text-slate-500">
                          <AlertCircle className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] leading-tight">Foto Surat Jalan</span>
                          {driveWebUrl && (
                            <a
                              href={driveWebUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                            >
                              <span>Buka Link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div 
                          className="relative group w-32 h-24 sm:w-40 sm:h-28 rounded-lg border border-slate-200 overflow-hidden cursor-pointer shadow-2xs hover:shadow-md transition bg-slate-100"
                          onClick={() => setPreviewImage({ url: selectedRecord.suratJalanPhoto!, title: `Surat Jalan - ${selectedRecord.queueNumber}` })}
                        >
                          <img
                            src={selectedRecord.suratJalanPhoto}
                            alt="Surat Jalan"
                            className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                            onError={() => handleImageError('surat_jalan')}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Foto Kondisi Barang / Bukti Bongkar */}
                  {selectedRecord.goodsPhotos?.map((photo, i) => {
                    const photoKey = `goods_${i}`;
                    const isError = imageErrors[photoKey];
                    return (
                      <div key={photoKey} className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block">
                          Foto Fisik #{i + 1}
                        </span>
                        {isError ? (
                          <div className="w-32 h-24 sm:w-40 sm:h-28 rounded-lg border border-slate-200 bg-slate-100 flex flex-col items-center justify-center p-2 text-center text-slate-500">
                            <AlertCircle className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[10px] leading-tight">Bukti #{i + 1}</span>
                            {driveWebUrl && (
                              <a
                                href={driveWebUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                              >
                                <span>Buka Link</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div 
                            className="relative group w-32 h-24 sm:w-40 sm:h-28 rounded-lg border border-slate-200 overflow-hidden cursor-pointer shadow-2xs hover:shadow-md transition bg-slate-100"
                            onClick={() => setPreviewImage({ url: photo, title: `Bukti Fisik Barang #${i + 1} - ${selectedRecord.queueNumber}` })}
                          >
                            <img
                              src={photo}
                              alt={`Goods Photo ${i + 1}`}
                              className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                              onError={() => handleImageError(photoKey)}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* D. Info Cloud Storage (Google Drive Box - Ringkas & Compact Banner) */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-700" />
                  Google Drive Cloud Storage: <span className="font-mono text-emerald-800">lkusdewanto@gmail.com</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Drive v3 Ready
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-white/95 p-2 rounded-lg border border-emerald-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Folder Utama:</span>
                  <span className="font-mono font-bold text-slate-800 truncate block">/Bongkar WH CKL/</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Subfolder SJ:</span>
                  <span className="font-mono text-emerald-800 truncate block" title={`/Surat_Jalan/${driveQueueFolder}`}>
                    /Surat_Jalan/{driveQueueFolder || 'Q'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Subfolder Fisik:</span>
                  <span className="font-mono text-emerald-800 truncate block" title={`/Foto_Kondisi_Barang/${driveQueueFolder}`}>
                    /Foto_Barang/{driveQueueFolder || 'Q'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Status Log:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Auto-Sync Sheets</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =======================================================
              3. MODAL FOOTER (Sticky di bawah)
             ======================================================= */}
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-slate-200 bg-slate-50/90 shrink-0 flex items-center justify-between gap-3 z-10">
            <div className="text-[11px] font-mono text-slate-500 truncate" title={selectedRecord.id}>
              ID: {selectedRecord.id}
            </div>

            <div className="flex items-center gap-2">
              {driveWebUrl && (
                <a
                  href={driveWebUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka Folder Drive</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs sm:text-sm font-bold truncate pr-2">{previewImage.title}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(previewImage.url, '_blank')}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1"
                  title="Buka Gambar di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="Tutup Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-4 flex-1 flex items-center justify-center overflow-auto bg-black/40">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

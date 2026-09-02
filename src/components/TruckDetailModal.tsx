import React from 'react';
import { 
  X, 
  Truck, 
  Clock, 
  Calendar, 
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
  FolderOpen
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { formatDateTime, formatShortTime, calculateLeadTime, formatDuration } from '../utils/timeUtils';

export const TruckDetailModal: React.FC = () => {
  const { selectedRecord, setSelectedRecord, currentTime } = useWarehouse();

  if (!selectedRecord) return null;

  const analysis = calculateLeadTime(selectedRecord, currentTime);
  const isOverdue = analysis.isOverdue;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-xl space-y-6 my-8 animate-in fade-in zoom-in duration-200 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base sm:text-lg text-blue-700">
                  {selectedRecord.queueNumber}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedRecord.status === 'MENUNGGU_VERIFIKASI_PO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  selectedRecord.status === 'WAITING_DOCK_QUEUE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  selectedRecord.status === 'PO_READY_DOCK_ASSIGNED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  selectedRecord.status === 'SEDANG_BONGKAR' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  selectedRecord.status === 'WAITING_ADMIN_VERIFICATION' || selectedRecord.status === 'MENUNGGU_VERIFIKASI_ADMIN' ? 'bg-amber-50 text-amber-900 border-amber-300' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {selectedRecord.status === 'WAITING_DOCK_QUEUE' ? 'ANTRI MUNDUR / HOLD' : selectedRecord.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mt-0.5">{selectedRecord.supplierName}</h3>
            </div>
          </div>

          <button
            onClick={() => setSelectedRecord(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Time & SLA Performance Summary Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold block">Jenis Armada</span>
            <span className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5 block">{selectedRecord.vehicleType}</span>
          </div>

          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold block">Standar SOP</span>
            <span className="font-mono font-bold text-orange-600 text-xs sm:text-sm mt-0.5 block">
              {analysis.standardMinutes} Menit
            </span>
          </div>

          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold block">Durasi Aktual</span>
            <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm mt-0.5 block">
              {formatDuration(analysis.actualUnloadingMinutes)}
            </span>
          </div>

          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold block">Status Lead Time</span>
            <span className={`font-bold text-xs sm:text-sm mt-0.5 inline-block ${
              isOverdue ? 'text-red-600' : 'text-emerald-600'
            }`}>
              {isOverdue ? `Overdue (+${analysis.varianceMinutes}m)` : `On-Time (${analysis.varianceMinutes}m)`}
            </span>
          </div>
        </div>

        {/* Complete 4-Step Milestone Audit Timeline */}
        <div className="space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Audit Trail Timestamp &amp; Milestone Serah Terima
          </h4>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {/* Step 1: Security Gate In (T1) */}
            <div className="relative space-y-1">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold">
                1
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  T1: Kedatangan Pintu Gerbang (Security)
                </span>
                <span className="text-xs font-mono text-blue-600 font-bold">
                  {formatDateTime(selectedRecord.t1GateIn)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Driver: <strong className="text-slate-800">{selectedRecord.driverName}</strong> ({selectedRecord.licensePlate})
                {selectedRecord.driverPhone && ` • Tel: ${selectedRecord.driverPhone}`}
              </p>
            </div>

            {/* Step 2: Admin Gudang PO Ready (T2) */}
            <div className="relative space-y-1">
              <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold ${
                selectedRecord.t2PoReady ? 'bg-orange-500' : 'bg-slate-200 text-slate-400'
              }`}>
                2
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5 text-orange-500" />
                  T2: Verifikasi Dokumen &amp; Cek PO PPIC
                </span>
                <span className="text-xs font-mono text-orange-600 font-bold">
                  {selectedRecord.t2PoReady ? formatDateTime(selectedRecord.t2PoReady) : 'Menunggu Verifikasi'}
                </span>
              </div>
              {selectedRecord.t2PoReady ? (
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p>No PO: <strong className="text-slate-800 font-mono">{selectedRecord.poNumber || '-'}</strong> • Lokasi: <strong className="text-emerald-700 font-mono">{selectedRecord.assignedDock}</strong></p>
                  <p className="text-[11px] text-slate-400">Waktu Tunggu Cek Dokumen (T2 - T1): {analysis.waitingPoMinutes} Menit</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Menunggu verifikasi admin gudang.</p>
              )}
            </div>

            {/* Step 3: Operator Start Unloading (T3) */}
            <div className="relative space-y-1">
              <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold ${
                selectedRecord.t3UnloadingStart ? 'bg-purple-600' : 'bg-slate-200 text-slate-400'
              }`}>
                3
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-purple-600" />
                  T3: Mulai Eksekusi Bongkaran Fisik (Operator)
                </span>
                <span className="text-xs font-mono text-purple-600 font-bold">
                  {selectedRecord.t3UnloadingStart ? formatDateTime(selectedRecord.t3UnloadingStart) : 'Belum Dimulai'}
                </span>
              </div>
              {selectedRecord.t3UnloadingStart ? (
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p>Petugas: <strong className="text-slate-800">{selectedRecord.operatorName || 'Kru Dock'}</strong></p>
                  <p className="text-[11px] text-slate-400">Waktu Antre Sebelum Bongkar (T3 - T2): {analysis.waitingStartMinutes} Menit</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Menunggu operator menekan tombol Mulai Bongkar.</p>
              )}
            </div>

            {/* Step 4: Finalization Unloading (T4) */}
            <div className="relative space-y-1">
              <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white text-white text-[10px] font-bold ${
                selectedRecord.t4UnloadingFinish ? 'bg-emerald-600' : 'bg-slate-200 text-slate-400'
              }`}>
                4
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                  T4: Finalisasi &amp; Validasi Fisik Selesai
                </span>
                <span className="text-xs font-mono text-emerald-600 font-bold">
                  {selectedRecord.t4UnloadingFinish ? formatDateTime(selectedRecord.t4UnloadingFinish) : 'Dalam Proses'}
                </span>
              </div>
              {selectedRecord.t4UnloadingFinish ? (
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p>
                    Manpower: <strong className="text-slate-800">{selectedRecord.operatorCount} Orang</strong> • 
                    Kondisi: <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      selectedRecord.goodsCondition === 'Sesuai' ? 'bg-emerald-50 text-emerald-700' :
                      selectedRecord.goodsCondition === 'Selisih' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>{selectedRecord.goodsCondition}</span>
                  </p>
                  {selectedRecord.adminFinalNotes && (
                    <p className="text-[11px] text-slate-600 italic pt-1">
                      Catatan: &quot;{selectedRecord.adminFinalNotes}&quot;
                    </p>
                  )}
                  <p className="text-[11px] text-emerald-700 font-bold pt-1">
                    Total Turnaround Time (Gate In sampai Selesai): {formatDuration(analysis.totalTurnaroundMinutes)}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Bongkaran fisik masih berlangsung.</p>
              )}
            </div>
          </div>
        </div>

        {/* Photos & Documentation Gallery */}
        {(selectedRecord.suratJalanPhoto || (selectedRecord.goodsPhotos && selectedRecord.goodsPhotos.length > 0)) && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Lampiran Foto Dokumen &amp; Bukti Kondisi Barang
            </h4>
            <div className="flex flex-wrap gap-3">
              {selectedRecord.suratJalanPhoto && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Surat Jalan:</span>
                  <img
                    src={selectedRecord.suratJalanPhoto}
                    alt="Surat Jalan"
                    className="w-24 h-24 object-cover rounded-xl border border-slate-200 hover:scale-105 transition cursor-pointer shadow-xs"
                    onClick={() => window.open(selectedRecord.suratJalanPhoto, '_blank')}
                  />
                </div>
              )}
              {selectedRecord.goodsPhotos?.map((photo, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Foto Fisik #{i + 1}:</span>
                  <img
                    src={photo}
                    alt={`Goods Photo ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border border-slate-200 hover:scale-105 transition cursor-pointer shadow-xs"
                    onClick={() => window.open(photo, '_blank')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Drive Storage Synchronization Status */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              Penyimpanan Cloud: Google Drive (lkusdewanto@gmail.com)
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Drive v3 Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-emerald-100">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Folder Utama Google Drive:</span>
              <span className="font-mono font-bold text-slate-800">/Bongkar WH CKL/</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Subfolder Surat Jalan:</span>
              <span className="font-mono text-[11px] text-emerald-700 truncate block">
                /Surat_Jalan/{selectedRecord.queueNumber.replace('#', '')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Subfolder Foto Fisik:</span>
              <span className="font-mono text-[11px] text-emerald-700 truncate block">
                /Foto_Kondisi_Barang/{selectedRecord.queueNumber.replace('#', '')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Sinkronisasi Database:</span>
              <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Auto-Export JSON &amp; CSV
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            ID Record: {selectedRecord.id}
          </div>
          <button
            onClick={() => setSelectedRecord(null)}
            className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

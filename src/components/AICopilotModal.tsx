import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Bot, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Warehouse, 
  Lightbulb,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { calculateLeadTime, formatDuration } from '../utils/timeUtils';

export const AICopilotModal: React.FC = () => {
  const { isAiModalOpen, setIsAiModalOpen, records, stats, currentTime } = useWarehouse();
  const [analyzing, setAnalyzing] = useState(false);
  const [insightsReady, setInsightsReady] = useState(true);

  if (!isAiModalOpen) return null;

  const overdueList = records.filter(r => calculateLeadTime(r, currentTime).isOverdue);
  const activeList = records.filter(r => r.status === 'SEDANG_BONGKAR');

  const handleRefreshAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setInsightsReady(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-xl space-y-6 my-8 animate-in fade-in zoom-in duration-200 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">AI Operations Copilot</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                  Lead Time Optimizer
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Analisis anomali antrean, prediksi keterlambatan, &amp; rekomendasi alokasi tenaga kerja.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAiModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Snapshot */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">SLA Compliance</span>
            <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">{stats.onTimeRate}%</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">Truk Terancam Overdue</span>
            <span className="text-xl font-black text-red-600 font-mono mt-0.5 block">{overdueList.length} Unit</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">Utilisasi Dock</span>
            <span className="text-xl font-black text-blue-600 font-mono mt-0.5 block">
              {stats.activeUnloading > 0 ? `${Math.min(100, Math.round((stats.activeUnloading / 6) * 100))}%` : '0%'}
            </span>
          </div>
        </div>

        {/* AI Actionable Insights */}
        <div className="space-y-3.5">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-orange-500" />
            Temuan Kritis &amp; Rekomendasi Tindakan Cepat (SPV)
          </h4>

          {/* Insight 1: Overdue Warning */}
          {overdueList.length > 0 ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-bold text-xs sm:text-sm">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Peringatan Bottleneck: {overdueList.length} Armada Melebihi Batas Waktu SOP</span>
              </div>
              <p className="text-xs text-slate-600">
                Truk <strong>{overdueList[0].supplierName}</strong> ({overdueList[0].vehicleType} di {overdueList[0].assignedDock || 'Dock'}) 
                telah melewati standar lead time SOP. Segera tambahkan 2 orang kuli cadangan ke dock tersebut untuk memangkas sisa waktu bongkar.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Alur Bongkar Optimal &amp; Sesuai Jadwal</span>
              </div>
              <p className="text-slate-600">
                Semua truk yang sedang aktif saat ini beroperasi dalam kurva waktu yang aman sesuai SOP masing-masing tipe kendaraan.
              </p>
            </div>
          )}

          {/* Insight 2: Manpower Optimization Recommendation */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-bold sm:text-sm">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Rekomendasi Alokasi Manpower Armada Berat</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Berdasarkan data historis, armada <strong>Wingbox 20T</strong> dan <strong>Tronton</strong> memiliki variansi durasi tertinggi saat dikerjakan oleh &lt;4 operator. Pastikan minimal 4 personil + 1 unit forklift aktif di Dock 01 &amp; Dock 04.
            </p>
          </div>

          {/* Insight 3: Document Turnaround Time */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold sm:text-sm">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>Efisiensi Verifikasi PO PPIC (T1 -&gt; T2)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Rata-rata waktu tunggu validasi Surat Jalan di Admin Gudang adalah <strong>18 menit</strong>. Ini masuk dalam kategori aman (&lt;25 menit batas wajar).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleRefreshAnalysis}
            disabled={analyzing}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer font-bold"
          >
            {analyzing ? 'Menganalisis Ulang...' : '⚡ Refresh Analisis'}
          </button>
          
          <button
            onClick={() => setIsAiModalOpen(false)}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
          >
            Tutup Rekomendasi
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  X, 
  Maximize2, 
  Minimize2, 
  Truck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Volume2, 
  VolumeX,
  Warehouse
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { formatShortTime, calculateLeadTime, formatDuration } from '../utils/timeUtils';

export const WallboardModal: React.FC = () => {
  const { 
    isWallboardOpen, 
    setIsWallboardOpen, 
    records, 
    stats, 
    currentTime, 
    soundEnabled, 
    setSoundEnabled 
  } = useWarehouse();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wallboardClock, setWallboardClock] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setWallboardClock(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!isWallboardOpen) return null;

  const activeBongkar = records.filter(r => r.status === 'SEDANG_BONGKAR');
  const waitingVerification = records.filter(r => r.status === 'WAITING_ADMIN_VERIFICATION');
  const readyDock = records.filter(r => r.status === 'PO_READY_DOCK_ASSIGNED');
  const waitingPO = records.filter(r => r.status === 'MENUNGGU_VERIFIKASI_PO');
  const finishedToday = records.filter(r => r.status === 'SELESAI_BONGKAR');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-y-auto p-4 sm:p-6 select-none">
      {/* Top Wallboard Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Warehouse className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Bongkar WH CKL
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  LIVE TV WALLBOARD
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Warehouse Inbound Logistics &amp; Unloading Command Center
            </p>
          </div>
        </div>

        {/* Center Big Digital Clock */}
        <div className="hidden md:flex items-center gap-3 px-6 py-2 rounded-2xl bg-slate-900 border border-slate-800 font-mono shadow-inner">
          <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-widest">
              {wallboardClock} <span className="text-sm font-normal text-slate-400">WIB</span>
            </div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer"
            title="Audio Alert"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsWallboardOpen(false)}
            className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition cursor-pointer"
            title="Tutup Wallboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 4 Big KPI Wallboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-6 shrink-0">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>1. TOTAL KEDATANGAN</span>
            <Truck className="w-5 h-5 text-blue-400" />
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-black font-mono text-white">
            {stats.totalToday} <span className="text-base text-slate-500 font-sans font-normal">Armada</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Masuk Gate-In hari ini</p>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>2. MENUNGGU / READY DOCK</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-black font-mono text-amber-400">
            {stats.waitingPO + (stats.waitingDockQueue || 0) + stats.readyDock}
          </div>
          <p className="text-xs text-amber-400/80 mt-2">
            {stats.waitingPO} Cek PO • {stats.waitingDockQueue || 0} Antri Mundur • {stats.readyDock} Ready Dock
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border-2 border-purple-500/60 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between text-purple-300 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
              <span>3. PROSES BONGKAR</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">LIVE</span>
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-black font-mono text-purple-300">
            {stats.activeUnloading} <span className="text-base text-slate-400 font-sans font-normal">Aktif</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.overdueCount > 0 ? (
              <span className="text-rose-400 font-bold animate-pulse">⚠️ {stats.overdueCount} Truk Melebihi SLA</span>
            ) : (
              <span className="text-emerald-400 font-medium">✓ Semua On-Track SLA</span>
            )}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>4. SELESAI BONGKAR</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-black font-mono text-emerald-400">
            {stats.completedToday}
          </div>
          <p className="text-xs text-emerald-400/80 mt-2">SLA Kepatuhan: <strong>{stats.onTimeRate}%</strong></p>
        </div>
      </div>

      {/* Main Grid: Active Unloading TV Screen (Left 7 cols) & Incoming Queue (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: Active Unloading Live Display Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
              STATUS REAL-TIME TRUK DI LOADING DOCK ({activeBongkar.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">Live Counter</span>
          </div>

          {activeBongkar.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500">
              Saat ini seluruh loading dock kosong atau sedang pergantian armada.
            </div>
          ) : (
            <div className="space-y-4">
              {activeBongkar.map((rec) => {
                const analysis = calculateLeadTime(rec, currentTime);
                const isOverdue = analysis.isOverdue;

                return (
                  <div
                    key={rec.id}
                    className={`rounded-3xl p-5 sm:p-6 border-2 transition shadow-2xl ${
                      isOverdue
                        ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/50 border-rose-500 ring-2 ring-rose-500/30'
                        : 'bg-slate-900 border-blue-500/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-mono font-black px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow">
                          {rec.queueNumber}
                        </span>
                        <span className="text-base font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 font-mono">
                          {rec.assignedDock}
                        </span>
                      </div>

                      {isOverdue ? (
                        <div className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 animate-bounce shadow-lg shadow-rose-600/50">
                          <AlertTriangle className="w-4 h-4" />
                          <span>OVERDUE +{analysis.varianceMinutes}m</span>
                        </div>
                      ) : (
                        <div className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                          🟢 ON-TRACK ({analysis.standardMinutes - analysis.actualUnloadingMinutes}m Sisa)
                        </div>
                      )}
                    </div>

                    <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <h4 className="text-xl sm:text-2xl font-black text-white leading-tight">
                          {rec.supplierName}
                        </h4>
                        <p className="text-sm font-mono text-slate-300 mt-1">
                          {rec.licensePlate} • {rec.driverName} • <strong className="text-blue-400">{rec.vehicleType}</strong>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Mulai: {formatShortTime(rec.t3UnloadingStart)} WIB • Tim: {rec.operatorName || 'Regu Dock'}
                        </p>
                      </div>

                      {/* Giant Elapsed Timer */}
                      <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-center">
                        <span className="text-xs text-slate-400 font-medium block">DURASI BONGKAR BERJALAN</span>
                        <div className={`text-3xl sm:text-4xl font-black font-mono tracking-wider mt-1 ${
                          isOverdue ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                        }`}>
                          {formatDuration(analysis.actualUnloadingMinutes)}
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden mt-3">
                          <div
                            className={`h-full ${isOverdue ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`}
                            style={{ width: `${Math.min(100, analysis.progressPercent)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Next Queues & Today Finished (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Waiting Admin Verification (if any) */}
          {waitingVerification.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-amber-950/30 border-2 border-amber-500/60 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  PERLU VERIFIKASI FISIK ADMIN ({waitingVerification.length})
                </h4>
                <span className="text-[11px] text-amber-300 font-mono font-bold">Selesai Operator</span>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {waitingVerification.map((rec) => (
                  <div key={rec.id} className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">{rec.queueNumber}</span>
                        <span className="text-xs font-semibold text-white truncate">{rec.supplierName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{rec.licensePlate} • {rec.driverName}</div>
                    </div>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {rec.assignedDock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ready at Dock */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                SIAP BONGKAR / DOCK ASSIGNED ({readyDock.length})
              </h4>
              <span className="text-xs text-slate-400">Menunggu kru dock</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {readyDock.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Tidak ada antrean siap dock saat ini.</p>
              ) : (
                readyDock.map((rec) => (
                  <div key={rec.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-400">{rec.queueNumber}</span>
                        <span className="text-xs font-semibold text-white truncate">{rec.supplierName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{rec.licensePlate} • {rec.vehicleType}</div>
                    </div>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {rec.assignedDock}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selesai Bongkar Hari Ini */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                SELESAI BONGKAR HARI INI ({finishedToday.length})
              </h4>
              <span className="text-xs text-emerald-400 font-mono">T4 Terverifikasi</span>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {finishedToday.map((rec) => {
                const analysis = calculateLeadTime(rec);
                return (
                  <div key={rec.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-400">{rec.queueNumber}</span>
                        <span className="font-semibold text-white">{rec.supplierName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Durasi: <strong className="text-slate-200">{formatDuration(analysis.actualUnloadingMinutes)}</strong> (Std: {analysis.standardMinutes}m)
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      analysis.isOverdue ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {analysis.isOverdue ? 'OVERDUE' : 'ON-TIME'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

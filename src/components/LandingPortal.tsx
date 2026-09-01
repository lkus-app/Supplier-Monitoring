import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ClipboardCheck, 
  HardHat, 
  BarChart3, 
  Lock, 
  Unlock, 
  ArrowRight, 
  Warehouse, 
  Clock, 
  Truck, 
  CheckCircle2, 
  Sparkles, 
  Tv, 
  LogIn, 
  UserCheck,
  HardDrive
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { RoleType } from '../types';
import { GoogleDriveModal } from './GoogleDriveModal';

export const LandingPortal: React.FC = () => {
  const { 
    navigateToRole, 
    authUser, 
    stats, 
    currentTime, 
    setIsWallboardOpen, 
    setIsAiModalOpen,
    logout 
  } = useWarehouse();

  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);

  const roleCards: {
    id: RoleType;
    title: string;
    roleLabel: string;
    subtitle: string;
    icon: React.ReactNode;
    isProtected: boolean;
    badge: string;
    badgeColor: string;
    colorAccent: string;
    borderHover: string;
    bgBadge: string;
    btnClass: string;
    features: string[];
  }[] = [
    {
      id: 'security',
      title: 'Pos Security Gerbang',
      roleLabel: 'SECURITY GATE PASS',
      subtitle: 'Pencatatan kedatangan armada truk dan penyerahan nomor antrean fisik (T1).',
      icon: <ShieldCheck className="w-8 h-8 text-blue-600" />,
      isProtected: false,
      badge: 'Akses Terbuka • Tanpa Login',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      colorAccent: 'blue',
      borderHover: 'hover:border-blue-500 hover:shadow-blue-500/10',
      bgBadge: 'bg-blue-50 text-blue-700',
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
      features: [
        'Form input kedatangan cepat (Mobile Friendly)',
        'Auto Timestamp Gate In (T1)',
        'Penetapan nomor antrean otomatis #Q-xxx',
        'Validasi data supir dan plat nomor'
      ],
    },
    {
      id: 'admin',
      title: 'Admin Gudang & Dokumen',
      roleLabel: 'ADMIN WAREHOUSE',
      subtitle: 'Verifikasi Surat Jalan fisik, validasi PO PPIC (T2), penetapan dock, & finalisasi serah terima (T4).',
      icon: <ClipboardCheck className="w-8 h-8 text-orange-600" />,
      isProtected: true,
      badge: 'Perlu Login',
      badgeColor: 'text-amber-800 bg-amber-50 border-amber-200',
      colorAccent: 'orange',
      borderHover: 'hover:border-orange-500 hover:shadow-orange-500/10',
      bgBadge: 'bg-orange-50 text-orange-700',
      btnClass: 'bg-orange-600 hover:bg-orange-700 text-white',
      features: [
        'Tahap 1: Verifikasi PO & Assign Zona Dock (T2)',
        'Tahap 2: Input Manpower & Cek Kondisi (T4)',
        'Audit trail dokumen & foto ketidaksesuaian',
        'Status serah terima real-time'
      ],
    },
    {
      id: 'operator',
      title: 'Operator Loading Dock',
      roleLabel: 'DOCK CREW INTERFACE',
      subtitle: 'Panel layar sentuh kru dock untuk memulai eksekusi bongkar fisik (T3) & monitoring stopwatch SOP.',
      icon: <HardHat className="w-8 h-8 text-purple-600" />,
      isProtected: true,
      badge: 'Perlu Login / PIN',
      badgeColor: 'text-purple-800 bg-purple-50 border-purple-200',
      colorAccent: 'purple',
      borderHover: 'hover:border-purple-500 hover:shadow-purple-500/10',
      bgBadge: 'bg-purple-50 text-purple-700',
      btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
      features: [
        'Tombol besar "Mulai Bongkar" (T3)',
        'Live running stopwatch vs Standar SOP',
        'Filter tampilan per zona loading dock',
        'Peringatan otomatis jika melebihi batas waktu'
      ],
    },
    {
      id: 'spv',
      title: 'Supervisor & Management',
      roleLabel: 'SPV / CONTROL TOWER',
      subtitle: 'Live Control Tower, TV Wallboard layar penuh, evaluasi SLA vendor, & laporan komprehensif Excel/PDF.',
      icon: <BarChart3 className="w-8 h-8 text-emerald-600" />,
      isProtected: true,
      badge: 'Perlu Login (Full Access)',
      badgeColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      colorAccent: 'emerald',
      borderHover: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
      bgBadge: 'bg-emerald-50 text-emerald-700',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      features: [
        'Ringkasan metrik operasional real-time',
        'Live table monitoring antrean lengkap',
        'Ekspor laporan audit ke CSV & Cetak PDF',
        'AI Copilot & TV Wallboard Fullscreen'
      ],
    }
  ];

  const timeFormatted = new Date(currentTime).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Brand Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 tracking-tight">Bongkar WH CKL</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Enterprise Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Sistem Monitoring Proses Bongkaran Barang Supplier WH CKL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Real-time Clock */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-semibold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{timeFormatted} WIB</span>
            </div>

            {/* TV Wallboard quick trigger */}
            <button
              onClick={() => setIsWallboardOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer"
              title="Layar TV Wallboard Monitor"
            >
              <Tv className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">TV Wallboard</span>
            </button>

            {/* AI Assistant */}
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition cursor-pointer"
              title="AI Lead Time Advisor"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* Google Drive Integration */}
            <button
              onClick={() => setIsGoogleDriveOpen(true)}
              id="btn-portal-gdrive"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer"
              title="Integrasi Google Drive Storage & Sync Center"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Google Drive</span>
            </button>

            {/* Active User session pill if logged in */}
            {authUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{authUser.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">{authUser.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  title="Logout Session"
                >
                  <span>Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Warehouse className="w-3.5 h-3.5 text-blue-600" />
            <span>Warehouse Operational Control Hub</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Selamat datang pada sistem monitoring bongkaran supplier
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Portal alur kerja terpadu untuk monitoring serah terima barang supplier mulai dari kedatangan di pos security (T1), verifikasi PO PPIC admin (T2), eksekusi bongkar dock (T3), hingga finalisasi kondisi fisik (T4).
          </p>

          {/* Quick Real-Time Metrics Strip */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Armada Hari Ini</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalToday}</span>
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Menunggu Cek PO (T2)</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-orange-600 font-mono">{stats.waitingPO}</span>
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Sedang Bongkar (T3)</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-purple-600 font-mono">{stats.activeUnloading}</span>
                <HardHat className="w-5 h-5 text-purple-600" />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Selesai Bongkar (T4)</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-emerald-600 font-mono">{stats.completedToday}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 4-Role Selection Cards Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Pilih Akses Role &amp; Stasiun Kerja
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Silakan pilih peran sesuai tanggung jawab tugas operasional Anda di lapangan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roleCards.map((card) => {
              const isCardActiveUser = authUser && authUser.role === card.id;

              return (
                <div
                  key={card.id}
                  id={`portal-card-${card.id}`}
                  className={`bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col justify-between transition duration-200 shadow-sm hover:shadow-md ${card.borderHover}`}
                >
                  <div className="space-y-4">
                    {/* Header with Icon and Protection status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        {card.icon}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${card.badgeColor} flex items-center gap-1`}>
                        {card.isProtected ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        <span>{card.badge}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        {card.roleLabel}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-0.5">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {card.subtitle}
                      </p>
                    </div>

                    {/* Features checklist */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      {card.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-6 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => navigateToRole(card.id)}
                      id={`btn-portal-enter-${card.id}`}
                      className={`w-full py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.98] ${card.btnClass}`}
                    >
                      {card.isProtected ? (
                        isCardActiveUser ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>Buka Panel ({authUser.name.split(' ')[0]})</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>Login {card.title.split(' ')[0]} ➔</span>
                          </>
                        )
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          <span>Masuk Pos Security (Langsung)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          SIM-BONGKAR Enterprise — Sistem Monitoring Proses Bongkaran Barang Supplier
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Standardized Milestone: T1 (Gate In) → T2 (PO Ready &amp; Dock) → T3 (Mulai Bongkar) → T4 (Selesai Validasi)
        </p>
      </footer>

      {/* Google Drive Integration Modal */}
      <GoogleDriveModal 
        isOpen={isGoogleDriveOpen} 
        onClose={() => setIsGoogleDriveOpen(false)} 
      />
    </div>
  );
};

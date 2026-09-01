import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ClipboardCheck, 
  HardHat, 
  BarChart3, 
  Tv, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Clock, 
  Warehouse,
  Sparkles,
  AlertTriangle,
  Home,
  LogOut,
  User,
  Lock,
  HardDrive
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { RoleType } from '../types';
import { GoogleDriveModal } from './GoogleDriveModal';

export const Navbar: React.FC = () => {
  const { 
    activeRole, 
    navigateToRole, 
    returnToPortal,
    authUser,
    logout,
    stats, 
    soundEnabled, 
    setSoundEnabled, 
    resetToDemoData,
    setIsWallboardOpen,
    setIsAiModalOpen
  } = useWarehouse();

  const [timeStr, setTimeStr] = useState<string>('');
  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const roles: { id: RoleType; label: string; icon: React.ReactNode; isProtected: boolean; badge?: number }[] = [
    { 
      id: 'security', 
      label: 'Security (Gate-In)', 
      isProtected: false,
      icon: <ShieldCheck className="w-4 h-4" /> 
    },
    { 
      id: 'admin', 
      label: 'Admin Gudang', 
      isProtected: true,
      icon: <ClipboardCheck className="w-4 h-4" />,
      badge: stats.waitingPO + (stats.waitingAdminVerification || 0)
    },
    { 
      id: 'operator', 
      label: 'Operator Dock', 
      isProtected: true,
      icon: <HardHat className="w-4 h-4" />,
      badge: stats.readyDock + stats.activeUnloading
    },
    { 
      id: 'spv', 
      label: 'SPV Monitoring', 
      isProtected: true,
      icon: <BarChart3 className="w-4 h-4" /> 
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner with Warehouse Name & Quick Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Title + Portal Return */}
        <div className="flex items-center gap-3">
          <button
            onClick={returnToPortal}
            id="btn-nav-return-portal"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer border border-slate-200"
            title="Kembali ke Portal Halaman Utama / Ganti Role"
          >
            <Home className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Portal Utama</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs text-white">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Bongkar WH CKL
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
                  {activeRole}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Operational Status & Quick Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Overdue Warning Pill */}
          {stats.overdueCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>{stats.overdueCount} Truk Overdue</span>
            </div>
          )}

          {/* Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{timeStr || '00:00:00'}</span>
          </div>

          {/* Google Drive Launcher */}
          <button
            onClick={() => setIsGoogleDriveOpen(true)}
            id="btn-nav-gdrive"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer"
            title="Google Drive Cloud Storage & Sync"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Google Drive</span>
          </button>

          {/* AI Copilot Advisor */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            id="btn-ai-copilot"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition cursor-pointer"
            title="Analisis AI & Optimasi Bottleneck"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* TV Wallboard Launcher */}
          <button
            onClick={() => setIsWallboardOpen(true)}
            id="btn-tv-wallboard"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition cursor-pointer"
            title="Buka Mode Layar TV Wallboard Fullscreen"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">TV Wallboard</span>
          </button>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            id="btn-sound-toggle"
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
              soundEnabled
                ? 'bg-slate-50 border-slate-200 text-blue-600 hover:bg-slate-100'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Alarm Suara Aktif' : 'Alarm Suara Mati'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset data simulasi ke data awal contoh?')) {
                resetToDemoData();
              }
            }}
            id="btn-reset-demo"
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer"
            title="Reset Data Simulasi Demo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* User Profile / Logout Button */}
          {authUser ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-slate-800 block leading-tight">{authUser.name}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">{authUser.role}</span>
              </div>
              <button
                onClick={logout}
                id="btn-nav-logout"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition cursor-pointer"
                title="Logout & Kembali ke Portal Utama"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={returnToPortal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition cursor-pointer"
            >
              <span>Ganti Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Navigation Bar Tabs */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs Role Workflow">
            {roles.map((role) => {
              const isActive = activeRole === role.id;
              return (
                <button
                  key={role.id}
                  id={`tab-role-${role.id}`}
                  onClick={() => navigateToRole(role.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>
                    {role.icon}
                  </span>
                  <span>{role.label}</span>
                  {role.isProtected && !authUser && (
                    <Lock className={`w-3 h-3 ${isActive ? 'text-blue-200' : 'text-slate-400'}`} />
                  )}
                  {typeof role.badge === 'number' && role.badge > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {role.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            onClick={returnToPortal}
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-bold cursor-pointer py-1 px-2 rounded-lg hover:bg-white transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </div>
      {/* Google Drive Storage Modal */}
      <GoogleDriveModal 
        isOpen={isGoogleDriveOpen} 
        onClose={() => setIsGoogleDriveOpen(false)} 
      />
    </header>
  );
};


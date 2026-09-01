import React, { useEffect, useRef } from 'react';
import { WarehouseProvider, useWarehouse } from './context/WarehouseContext';
import { Navbar } from './components/Navbar';
import { LandingPortal } from './components/LandingPortal';
import { SecurityView } from './components/SecurityView';
import { AdminView } from './components/AdminView';
import { OperatorView } from './components/OperatorView';
import { SupervisorView } from './components/SupervisorView';
import { TruckDetailModal } from './components/TruckDetailModal';
import { WallboardModal } from './components/WallboardModal';
import { AICopilotModal } from './components/AICopilotModal';
import { AuthModal } from './components/AuthModal';
import { 
  ShieldCheck, 
  ClipboardCheck, 
  HardHat, 
  BarChart3,
  Home,
  Lock
} from 'lucide-react';
import { RoleType } from './types';

const MainContent: React.FC = () => {
  const { 
    activeView, 
    activeRole, 
    navigateToRole, 
    returnToPortal, 
    authUser,
    stats, 
    soundEnabled 
  } = useWarehouse();
  
  const lastOverdueCountRef = useRef(stats.overdueCount);

  // Audio tone notification on overdue trigger
  useEffect(() => {
    if (soundEnabled && stats.overdueCount > lastOverdueCountRef.current) {
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {
        // audio context blocked or not supported
      }
    }
    lastOverdueCountRef.current = stats.overdueCount;
  }, [stats.overdueCount, soundEnabled]);

  const renderActiveView = () => {
    switch (activeRole) {
      case 'security':
        return <SecurityView />;
      case 'admin':
        return <AdminView />;
      case 'operator':
        return <OperatorView />;
      case 'spv':
      default:
        return <SupervisorView />;
    }
  };

  const mobileTabs: { id: RoleType | 'portal'; label: string; icon: React.ReactNode; badge?: number; isProtected?: boolean }[] = [
    { id: 'portal', label: 'Portal', icon: <Home className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin', icon: <ClipboardCheck className="w-5 h-5" />, badge: stats.waitingPO, isProtected: true },
    { id: 'operator', label: 'Operator', icon: <HardHat className="w-5 h-5" />, badge: stats.readyDock + stats.activeUnloading, isProtected: true },
    { id: 'spv', label: 'SPV', icon: <BarChart3 className="w-5 h-5" />, isProtected: true },
  ];

  // If on landing portal
  if (activeView === 'portal') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <LandingPortal />
        
        {/* Global Modals */}
        <AuthModal />
        <TruckDetailModal />
        <WallboardModal />
        <AICopilotModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-20 md:pb-8 selection:bg-blue-600 selection:text-white">
      <Navbar />

      {/* Main Role Content */}
      <main className="flex-1 w-full">
        {renderActiveView()}
      </main>

      {/* Global Modals */}
      <AuthModal />
      <TruckDetailModal />
      <WallboardModal />
      <AICopilotModal />

      {/* Mobile Bottom Fixed Role Bar for Seamless Handheld Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg">
        {mobileTabs.map((tab) => {
          const isActive = tab.id === 'portal' ? activeView === 'portal' : activeRole === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'portal') {
                  returnToPortal();
                } else {
                  navigateToRole(tab.id as RoleType);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer relative ${
                isActive ? 'text-blue-600 font-bold bg-blue-50' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-orange-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <WarehouseProvider>
      <MainContent />
    </WarehouseProvider>
  );
}


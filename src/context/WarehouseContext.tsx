import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { UnloadingRecord, RoleType, AppViewType, AuthUser, DEMO_ACCOUNTS, OperationalStats, GoodsCondition, VehicleType } from '../types';
import { INITIAL_UNLOADING_RECORDS } from '../data/initialData';
import { calculateLeadTime } from '../utils/timeUtils';

const STORAGE_KEY = 'warehouse_unloading_system_v1';
const AUTH_STORAGE_KEY = 'warehouse_unloading_auth_user_v1';

interface WarehouseContextType {
  records: UnloadingRecord[];
  activeView: AppViewType;
  setActiveView: (view: AppViewType) => void;
  activeRole: RoleType;
  setActiveRole: (role: RoleType) => void;
  authUser: AuthUser | null;
  currentTime: number;
  stats: OperationalStats;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Auth Modal & Handlers
  isAuthModalOpen: boolean;
  authModalRole: RoleType | null;
  openAuthModal: (role: RoleType) => void;
  closeAuthModal: () => void;
  loginWithCredentials: (role: RoleType, identifier: string, secret?: string) => { success: boolean; message?: string };
  quickDemoLogin: (role: RoleType) => void;
  logout: () => void;
  navigateToRole: (role: RoleType) => void;
  returnToPortal: () => void;

  // Actions
  addTruckGateIn: (data: {
    supplierName: string;
    driverName: string;
    licensePlate: string;
    vehicleType: VehicleType;
    driverPhone?: string;
    suratJalanNumber?: string;
    suratJalanPhoto?: string;
  }) => UnloadingRecord;
  
  verifyPOAndAssignDock: (id: string, data: {
    poNumber: string;
    assignedDock: string;
    adminNotes?: string;
    adminName?: string;
    suratJalanPhoto?: string;
  }) => void;
  
  startUnloading: (id: string, operatorName: string) => void;
  
  operatorFinishUnloading: (id: string, data: {
    operatorName?: string;
    operatorNotes?: string;
    photos?: string[];
  }) => void;
  
  finishUnloading: (id: string, data: {
    operatorCount: number;
    goodsCondition: GoodsCondition;
    adminFinalNotes?: string;
    goodsPhotos?: string[];
    adminName?: string;
  }) => void;
  
  deleteRecord: (id: string) => void;
  resetToDemoData: () => void;
  
  // Modal states
  selectedRecord: UnloadingRecord | null;
  setSelectedRecord: (record: UnloadingRecord | null) => void;
  isWallboardOpen: boolean;
  setIsWallboardOpen: (open: boolean) => void;
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

export const WarehouseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<UnloadingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_UNLOADING_RECORDS;
  });

  const [activeView, setActiveView] = useState<AppViewType>('portal');
  const [activeRole, setActiveRole] = useState<RoleType>('security');
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalRole, setAuthModalRole] = useState<RoleType | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedRecord, setSelectedRecord] = useState<UnloadingRecord | null>(null);
  const [isWallboardOpen, setIsWallboardOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save warehouse records:', e);
    }
  }, [records]);

  // Sync Auth User to localStorage
  useEffect(() => {
    try {
      if (authUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save auth state:', e);
    }
  }, [authUser]);

  // Keep live time ticking every 2 seconds for reactive lead-time gauges
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Auth Operations
  const openAuthModal = (role: RoleType) => {
    setAuthModalRole(role);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalRole(null);
  };

  const loginWithCredentials = (
    role: RoleType,
    identifier: string,
    secret?: string
  ): { success: boolean; message?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanSecret = (secret || '').trim();

    if (role === 'admin') {
      const demo = DEMO_ACCOUNTS.admin;
      if (cleanId === demo.username && cleanSecret === demo.password) {
        const user: AuthUser = {
          role: 'admin',
          username: demo.username,
          name: demo.name,
          loggedInAt: new Date().toISOString(),
        };
        setAuthUser(user);
        setActiveRole('admin');
        setActiveView('admin');
        closeAuthModal();
        return { success: true };
      }
      return { success: false, message: 'Username atau Password Admin salah! (Demo: admin / admin123)' };
    }

    if (role === 'operator') {
      const demo = DEMO_ACCOUNTS.operator;
      // Allow PIN login or username/password
      if (cleanSecret === demo.pin || (cleanId === demo.username && cleanSecret === demo.password)) {
        const user: AuthUser = {
          role: 'operator',
          username: demo.username,
          name: demo.name,
          loggedInAt: new Date().toISOString(),
        };
        setAuthUser(user);
        setActiveRole('operator');
        setActiveView('operator');
        closeAuthModal();
        return { success: true };
      }
      return { success: false, message: 'PIN atau Kredensial Operator salah! (Demo: PIN 1234 atau operator / operator123)' };
    }

    if (role === 'spv') {
      const demo = DEMO_ACCOUNTS.spv;
      if (cleanId === demo.username && cleanSecret === demo.password) {
        const user: AuthUser = {
          role: 'spv',
          username: demo.username,
          name: demo.name,
          loggedInAt: new Date().toISOString(),
        };
        setAuthUser(user);
        setActiveRole('spv');
        setActiveView('spv');
        closeAuthModal();
        return { success: true };
      }
      return { success: false, message: 'Username atau Password SPV salah! (Demo: spv / spv123)' };
    }

    return { success: false, message: 'Role tidak valid.' };
  };

  const quickDemoLogin = (role: RoleType) => {
    if (role === 'security') {
      setActiveRole('security');
      setActiveView('security');
      closeAuthModal();
      return;
    }

    const demo = DEMO_ACCOUNTS[role];
    if (demo) {
      const user: AuthUser = {
        role,
        username: demo.username,
        name: demo.name,
        loggedInAt: new Date().toISOString(),
      };
      setAuthUser(user);
      setActiveRole(role);
      setActiveView(role);
      closeAuthModal();
    }
  };

  const logout = () => {
    setAuthUser(null);
    setActiveView('portal');
  };

  const returnToPortal = () => {
    setActiveView('portal');
  };

  const navigateToRole = (role: RoleType) => {
    if (role === 'security') {
      setActiveRole('security');
      setActiveView('security');
      return;
    }

    // Check if user is logged in as this role or has active session
    if (authUser && (authUser.role === role || authUser.role === 'spv')) {
      setActiveRole(role);
      setActiveView(role);
    } else {
      openAuthModal(role);
    }
  };

  // Compute live operational statistics
  const stats = useMemo<OperationalStats>(() => {
    let totalToday = records.length;
    let waitingPO = 0;
    let readyDock = 0;
    let activeUnloading = 0;
    let waitingAdminVerification = 0;
    let completedToday = 0;
    let onTimeCount = 0;
    let overdueCount = 0;
    let totalDurationSum = 0;
    let completedWithDurationCount = 0;

    records.forEach((r) => {
      const analysis = calculateLeadTime(r, currentTime);
      
      if (r.status === 'MENUNGGU_VERIFIKASI_PO') {
        waitingPO++;
      } else if (r.status === 'PO_READY_DOCK_ASSIGNED') {
        readyDock++;
      } else if (r.status === 'SEDANG_BONGKAR') {
        activeUnloading++;
        if (analysis.isOverdue) overdueCount++;
      } else if (r.status === 'WAITING_ADMIN_VERIFICATION' || r.status === 'MENUNGGU_VERIFIKASI_ADMIN') {
        waitingAdminVerification++;
        if (analysis.isOverdue) overdueCount++;
      } else if (r.status === 'SELESAI_BONGKAR' || r.status === 'FINISHED') {
        completedToday++;
        if (analysis.isOverdue) {
          overdueCount++;
        } else {
          onTimeCount++;
        }
        if (analysis.actualUnloadingMinutes > 0) {
          totalDurationSum += analysis.actualUnloadingMinutes;
          completedWithDurationCount++;
        }
      }
    });

    const evaluatedTotal = onTimeCount + (completedToday > 0 ? (overdueCount) : 0);
    const onTimeRate = evaluatedTotal > 0 ? Math.round((onTimeCount / evaluatedTotal) * 100) : 100;
    const avgDurationMinutes = completedWithDurationCount > 0 ? Math.round(totalDurationSum / completedWithDurationCount) : 0;

    return {
      totalToday,
      waitingPO,
      readyDock,
      activeUnloading,
      waitingAdminVerification,
      completedToday,
      onTimeCount,
      overdueCount,
      onTimeRate,
      avgDurationMinutes,
    };
  }, [records, currentTime]);

  // Action: Add Truck (Security Gate In -> T1)
  const addTruckGateIn = (data: {
    supplierName: string;
    driverName: string;
    licensePlate: string;
    vehicleType: VehicleType;
    driverPhone?: string;
    suratJalanNumber?: string;
    suratJalanPhoto?: string;
  }): UnloadingRecord => {
    const nextSeqNumber = records.length + 1;
    const queueNumber = `#Q-${String(nextSeqNumber).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];

    const newRecord: UnloadingRecord = {
      id: `rec-${Date.now()}`,
      queueNumber,
      date: todayDate,
      supplierName: data.supplierName.trim(),
      driverName: data.driverName.trim(),
      licensePlate: data.licensePlate.trim().toUpperCase(),
      vehicleType: data.vehicleType,
      driverPhone: data.driverPhone?.trim(),
      suratJalanNumber: data.suratJalanNumber?.trim() || `SJ-${Date.now().toString().slice(-6)}`,
      suratJalanPhoto: data.suratJalanPhoto,
      t1GateIn: nowIso,
      status: 'MENUNGGU_VERIFIKASI_PO',
    };

    setRecords((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  // Action: Admin Step 1 (Verify PO -> T2 & Assign Dock)
  const verifyPOAndAssignDock = (id: string, data: {
    poNumber: string;
    assignedDock: string;
    adminNotes?: string;
    adminName?: string;
    suratJalanPhoto?: string;
  }) => {
    const nowIso = new Date().toISOString();
    setRecords((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            t2PoReady: nowIso,
            poNumber: data.poNumber.trim(),
            assignedDock: data.assignedDock.trim(),
            adminNotesStep1: data.adminNotes?.trim(),
            adminNameStep1: data.adminName?.trim() || authUser?.name || 'Admin Gudang',
            suratJalanPhoto: data.suratJalanPhoto || item.suratJalanPhoto,
            status: 'PO_READY_DOCK_ASSIGNED',
          };
        }
        return item;
      })
    );
  };

  // Action: Operator Step (Start Unloading -> T3)
  const startUnloading = (id: string, operatorName: string) => {
    const nowIso = new Date().toISOString();
    setRecords((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            t3UnloadingStart: nowIso,
            operatorName: operatorName.trim() || authUser?.name || 'Operator Dock',
            status: 'SEDANG_BONGKAR',
          };
        }
        return item;
      })
    );
  };

  // Action: Operator Step (Finish Unloading -> T4 Operator & Send Verification to Admin)
  const operatorFinishUnloading = (id: string, data: {
    operatorName?: string;
    operatorNotes?: string;
    photos?: string[];
  }) => {
    const nowIso = new Date().toISOString();
    setRecords((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const combinedPhotos = [
            ...(item.goodsPhotos || []),
            ...(data.photos || []),
          ];
          return {
            ...item,
            t4Operator: nowIso,
            operatorName: data.operatorName?.trim() || item.operatorName || authUser?.name || 'Operator Dock',
            operatorNotes: data.operatorNotes?.trim() || item.operatorNotes,
            operatorPhotos: data.photos && data.photos.length > 0 ? data.photos : item.operatorPhotos,
            goodsPhotos: combinedPhotos.length > 0 ? combinedPhotos : item.goodsPhotos,
            status: 'WAITING_ADMIN_VERIFICATION',
          };
        }
        return item;
      })
    );
  };

  // Action: Admin Step 2 (Finalize Unloading -> T4 Final)
  const finishUnloading = (id: string, data: {
    operatorCount: number;
    goodsCondition: GoodsCondition;
    adminFinalNotes?: string;
    goodsPhotos?: string[];
    adminName?: string;
  }) => {
    const nowIso = new Date().toISOString();
    setRecords((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            t4UnloadingFinish: nowIso,
            operatorCount: data.operatorCount,
            goodsCondition: data.goodsCondition,
            adminFinalNotes: data.adminFinalNotes?.trim(),
            goodsPhotos: data.goodsPhotos && data.goodsPhotos.length > 0 ? data.goodsPhotos : item.goodsPhotos,
            adminNameStep2: data.adminName?.trim() || authUser?.name || 'Admin Gudang',
            status: 'SELESAI_BONGKAR',
          };
        }
        return item;
      })
    );
  };

  // Action: Delete
  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecord?.id === id) setSelectedRecord(null);
  };

  // Action: Reset Demo
  const resetToDemoData = () => {
    setRecords(INITIAL_UNLOADING_RECORDS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_UNLOADING_RECORDS));
    } catch {
      // ignore
    }
  };

  return (
    <WarehouseContext.Provider
      value={{
        records,
        activeView,
        setActiveView,
        activeRole,
        setActiveRole,
        authUser,
        currentTime,
        stats,
        soundEnabled,
        setSoundEnabled,
        isAuthModalOpen,
        authModalRole,
        openAuthModal,
        closeAuthModal,
        loginWithCredentials,
        quickDemoLogin,
        logout,
        navigateToRole,
        returnToPortal,
        addTruckGateIn,
        verifyPOAndAssignDock,
        startUnloading,
        operatorFinishUnloading,
        finishUnloading,
        deleteRecord,
        resetToDemoData,
        selectedRecord,
        setSelectedRecord,
        isWallboardOpen,
        setIsWallboardOpen,
        isAiModalOpen,
        setIsAiModalOpen,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within a WarehouseProvider');
  }
  return context;
};


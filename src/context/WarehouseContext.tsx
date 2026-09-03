import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback, useRef } from 'react';
import { UnloadingRecord, RoleType, AppViewType, AuthUser, DEMO_ACCOUNTS, OperationalStats, GoodsCondition, VehicleType, WarehouseZone } from '../types';
import { calculateLeadTime, getLocalDateString, isRecordToday } from '../utils/timeUtils';
import {
  fetchRecordsFromGoogleSheets,
  saveRecordToGoogleSheets,
  deleteRecordFromGoogleSheets,
  clearAllFromGoogleSheets,
  getGoogleAppsScriptUrl,
  setGoogleAppsScriptUrl
} from '../utils/googleSheetsSync';

const AUTH_STORAGE_KEY = 'warehouse_unloading_auth_user_v1';
const SYNC_CHANNEL_NAME = 'sim_bongkar_sync_channel_v2';

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
  isSyncing: boolean;
  lastSyncTime: string | null;
  gasUrl: string;
  updateGasUrl: (url: string) => void;
  refreshDataFromServer: () => Promise<void>;
  
  // Auth Modal & Handlers
  isAuthModalOpen: boolean;
  authModalRole: RoleType | null;
  openAuthModal: (role: RoleType) => void;
  closeAuthModal: () => void;
  loginWithCredentials: (role: RoleType, identifier: string, secret?: string) => { success: boolean; message?: string };
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
  }) => Promise<UnloadingRecord>;
  
  verifyPOAndAssignDock: (id: string, data: {
    assignedDock: string;
    poNumber?: string;
    adminNotes?: string;
    adminName?: string;
    suratJalanPhoto?: string;
    qcApprovalTime?: string;
    qcApprovedBy?: string;
  }) => Promise<void>;

  verifyPOAndHold: (id: string, data: {
    assignedDock: string;
    poNumber?: string;
    adminNotes?: string;
    adminName?: string;
    suratJalanPhoto?: string;
    qcApprovalTime?: string;
    qcApprovedBy?: string;
  }) => Promise<void>;

  releaseQueueToDock: (id: string) => Promise<void>;
  
  startUnloading: (id: string, operatorName: string) => Promise<void>;

  // Relokasi & Ganti Zona Bongkar
  requestZoneChange: (id: string, newZone: WarehouseZone, reason: string) => Promise<void>;
  approveZoneChange: (id: string) => Promise<void>;
  rejectZoneChange: (id: string) => Promise<void>;
  
  operatorFinishUnloading: (id: string, data: {
    operatorName?: string;
    operatorNotes?: string;
    photos?: string[];
  }) => Promise<void>;
  
  finishUnloading: (id: string, data: {
    operatorCount: number;
    goodsCondition: GoodsCondition;
    adminFinalNotes?: string;
    goodsPhotos?: string[];
    adminName?: string;
  }) => Promise<void>;
  
  deleteRecord: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  resetToDemoData: () => Promise<void>;
  
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
  const [records, setRecords] = useState<UnloadingRecord[]>([]);
  const [activeView, setActiveView] = useState<AppViewType>('portal');
  const [activeRole, setActiveRole] = useState<RoleType>('security');
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Synchronize with BroadcastChannel for instant same-browser cross-tab sync
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_RECORDS' && Array.isArray(event.data.records)) {
            setRecords(event.data.records);
            setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
          } else if (event.data?.type === 'FORCE_REFETCH') {
            refreshDataFromServer();
          }
        };

        return () => {
          channel.close();
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in current environment', e);
    }
  }, []);

  const broadcastRecords = useCallback((newRecords: UnloadingRecord[]) => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'SYNC_RECORDS',
          records: newRecords,
          timestamp: Date.now(),
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const broadcastForceRefetch = useCallback(() => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'FORCE_REFETCH',
          timestamp: Date.now(),
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const [gasUrl, setGasUrlState] = useState<string>(() => getGoogleAppsScriptUrl());

  const updateGasUrl = (newUrl: string) => {
    setGoogleAppsScriptUrl(newUrl);
    setGasUrlState(getGoogleAppsScriptUrl());
    refreshDataFromServer();
  };

  // Fetch all records directly from Google Sheets via Apps Script
  const refreshDataFromServer = useCallback(async () => {
    try {
      const gasResult = await fetchRecordsFromGoogleSheets();
      if (gasResult && gasResult.success && Array.isArray(gasResult.records)) {
        setRecords(gasResult.records);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    } catch (gasErr) {
      console.warn('Google Sheets fetch error:', gasErr);
    }
  }, []);

  // Polling every 5 seconds for continuous cross-device synchronization (PC vs Mobile)
  useEffect(() => {
    refreshDataFromServer();

    const pollInterval = setInterval(() => {
      refreshDataFromServer();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [refreshDataFromServer]);

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
      return { success: false, message: 'Username atau Password Admin salah!' };
    }

    if (role === 'operator') {
      const demo = DEMO_ACCOUNTS.operator;
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
      return { success: false, message: 'PIN atau Kredensial Operator salah!' };
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
      return { success: false, message: 'Username atau Password SPV salah!' };
    }

    return { success: false, message: 'Role tidak valid.' };
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

    if (authUser && (authUser.role === role || authUser.role === 'spv')) {
      setActiveRole(role);
      setActiveView(role);
    } else {
      openAuthModal(role);
    }
  };

  // Compute live operational statistics for today's operational dashboard
  const stats = useMemo<OperationalStats>(() => {
    const todayStr = getLocalDateString();
    
    // Total kedatangan supplier yang tercatat hari ini
    const todayRecords = records.filter(r => isRecordToday(r, todayStr));
    const totalToday = todayRecords.length;

    let waitingPO = 0;
    let waitingDockQueue = 0;
    let readyDock = 0;
    let activeUnloading = 0;
    let waitingAdminVerification = 0;
    let completedToday = 0;
    let onTimeCount = 0;
    let overdueCount = 0;
    let totalDurationSum = 0;
    let completedWithDurationCount = 0;

    records.forEach((r) => {
      const isFromToday = isRecordToday(r, todayStr);
      const analysis = calculateLeadTime(r, currentTime);
      
      if (r.status === 'MENUNGGU_VERIFIKASI_PO') {
        waitingPO++;
      } else if (r.status === 'WAITING_DOCK_QUEUE') {
        waitingDockQueue++;
      } else if (r.status === 'PO_READY_DOCK_ASSIGNED') {
        readyDock++;
      } else if (r.status === 'SEDANG_BONGKAR') {
        activeUnloading++;
        if (analysis.isOverdue) overdueCount++;
      } else if (r.status === 'WAITING_ADMIN_VERIFICATION' || r.status === 'MENUNGGU_VERIFIKASI_ADMIN') {
        waitingAdminVerification++;
        if (analysis.isOverdue) overdueCount++;
      } else if (r.status === 'SELESAI_BONGKAR' || r.status === 'FINISHED') {
        // Hanya hitung yang selesai hari ini, tidak diakumulasi dari hari-hari sebelumnya
        if (isFromToday) {
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
      }
    });

    const evaluatedTotal = onTimeCount + (completedToday > 0 ? (overdueCount) : 0);
    const onTimeRate = evaluatedTotal > 0 ? Math.round((onTimeCount / evaluatedTotal) * 100) : 100;
    const avgDurationMinutes = completedWithDurationCount > 0 ? Math.round(totalDurationSum / completedWithDurationCount) : 0;

    return {
      totalToday,
      waitingPO,
      waitingDockQueue,
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
  const addTruckGateIn = async (data: {
    supplierName: string;
    driverName: string;
    licensePlate: string;
    vehicleType: VehicleType;
    driverPhone?: string;
    suratJalanNumber?: string;
    suratJalanPhoto?: string;
  }): Promise<UnloadingRecord> => {
    const todayDate = getLocalDateString();
    
    // Cari nomor urutan tertinggi KHUSUS untuk hari ini (reset ke 000 setiap pergantian hari / 00:00:00)
    let maxNum = 0;
    records.forEach((r) => {
      if (isRecordToday(r, todayDate)) {
        const match = r.queueNumber?.match(/#Q-(\d+)/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const nextSeqNumber = maxNum + 1;
    const queueNumber = `#Q-${String(nextSeqNumber).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newRecord: UnloadingRecord = {
      id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      queueNumber,
      date: todayDate,
      supplierName: data.supplierName.trim(),
      driverName: data.driverName.trim(),
      licensePlate: data.licensePlate.trim().toUpperCase(),
      vehicleType: data.vehicleType,
      driverPhone: data.driverPhone?.trim() || '',
      suratJalanNumber: data.suratJalanNumber?.trim() || '',
      suratJalanPhoto: data.suratJalanPhoto || '',
      t1GateIn: nowIso,
      status: 'MENUNGGU_VERIFIKASI_PO',
    };

    // Optimistic local update
    const updated = [newRecord, ...records];
    setRecords(updated);
    broadcastRecords(updated);

    // Save directly to Google Sheets
    try {
      setIsSyncing(true);
      await saveRecordToGoogleSheets(newRecord);
    } catch (err) {
      console.warn('GAS save error:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    }

    return newRecord;
  };

  // Action: Admin Step 1 (Verify PO -> T2 & Assign Dock & Direct to Dock)
  const verifyPOAndAssignDock = async (id: string, data: {
    assignedDock: string;
    poNumber?: string;
    adminNotes?: string;
    adminName?: string;
    suratJalanPhoto?: string;
    qcApprovalTime?: string;
    qcApprovedBy?: string;
  }) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          t2PoReady: nowIso,
          poNumber: data.poNumber?.trim() || item.poNumber || '-',
          assignedDock: data.assignedDock.trim(),
          adminNotesStep1: data.adminNotes?.trim(),
          adminNameStep1: data.adminName?.trim() || authUser?.name || 'Admin Gudang',
          suratJalanPhoto: data.suratJalanPhoto !== undefined ? data.suratJalanPhoto : item.suratJalanPhoto,
          qcApprovalTime: data.qcApprovalTime !== undefined ? data.qcApprovalTime : item.qcApprovalTime,
          qcApprovedBy: data.qcApprovedBy !== undefined ? data.qcApprovedBy : item.qcApprovedBy,
          status: 'PO_READY_DOCK_ASSIGNED',
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Admin Step 1 Option B (Verify PO & Hold Area / Antri Mundur -> T2 recorded, status: WAITING_DOCK_QUEUE)
  const verifyPOAndHold = async (id: string, data: {
    assignedDock: string;
    poNumber?: string;
    adminNotes?: string;
    adminName?: string;
    suratJalanPhoto?: string;
    qcApprovalTime?: string;
    qcApprovedBy?: string;
  }) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          t2PoReady: nowIso,
          poNumber: data.poNumber?.trim() || item.poNumber || '-',
          assignedDock: data.assignedDock.trim(),
          adminNotesStep1: data.adminNotes?.trim(),
          adminNameStep1: data.adminName?.trim() || authUser?.name || 'Admin Gudang',
          suratJalanPhoto: data.suratJalanPhoto !== undefined ? data.suratJalanPhoto : item.suratJalanPhoto,
          qcApprovalTime: data.qcApprovalTime !== undefined ? data.qcApprovalTime : item.qcApprovalTime,
          qcApprovedBy: data.qcApprovedBy !== undefined ? data.qcApprovedBy : item.qcApprovedBy,
          status: 'WAITING_DOCK_QUEUE',
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Release from Antri Mundur to Ready Dock (WAITING_DOCK_QUEUE -> PO_READY_DOCK_ASSIGNED)
  const releaseQueueToDock = async (id: string) => {
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          status: 'PO_READY_DOCK_ASSIGNED' as const,
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Operator Step (Start Unloading -> T3)
  const startUnloading = async (id: string, operatorName: string) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          t3UnloadingStart: nowIso,
          operatorName: operatorName.trim() || authUser?.name || 'Operator Dock',
          status: 'SEDANG_BONGKAR',
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Request Relokasi / Ganti Zona Bongkar (Operator -> SPV)
  const requestZoneChange = async (id: string, newZone: WarehouseZone, reason: string) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          zoneChangeRequest: {
            requestedZone: newZone,
            reason: reason.trim(),
            requestedAt: nowIso,
            requestedBy: authUser?.name || 'Operator WH CKL',
            status: 'PENDING' as const,
          },
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Approve Ganti Zona Bongkar (SPV)
  const approveZoneChange = async (id: string) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id && item.zoneChangeRequest && item.zoneChangeRequest.status === 'PENDING') {
        updatedItem = {
          ...item,
          assignedDock: item.zoneChangeRequest.requestedZone,
          zoneChangeRequest: {
            ...item.zoneChangeRequest,
            status: 'APPROVED' as const,
            reviewedAt: nowIso,
            reviewedBy: authUser?.name || 'Supervisor WH CKL',
          },
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Reject Ganti Zona Bongkar (SPV)
  const rejectZoneChange = async (id: string) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id && item.zoneChangeRequest && item.zoneChangeRequest.status === 'PENDING') {
        updatedItem = {
          ...item,
          zoneChangeRequest: {
            ...item.zoneChangeRequest,
            status: 'REJECTED' as const,
            reviewedAt: nowIso,
            reviewedBy: authUser?.name || 'Supervisor WH CKL',
          },
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Operator Step (Finish Unloading -> T4 Operator & Send Verification to Admin)
  const operatorFinishUnloading = async (id: string, data: {
    operatorName?: string;
    operatorNotes?: string;
    photos?: string[];
  }) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id) {
        const combinedPhotos = [
          ...(item.goodsPhotos || []),
          ...(data.photos || []),
        ];
        updatedItem = {
          ...item,
          t4Operator: nowIso,
          operatorName: data.operatorName?.trim() || item.operatorName || authUser?.name || 'Operator Dock',
          operatorNotes: data.operatorNotes?.trim() || item.operatorNotes,
          operatorPhotos: data.photos && data.photos.length > 0 ? data.photos : item.operatorPhotos,
          goodsPhotos: combinedPhotos.length > 0 ? combinedPhotos : item.goodsPhotos,
          status: 'WAITING_ADMIN_VERIFICATION',
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Admin Step 2 (Finalize Unloading -> T4 Final)
  const finishUnloading = async (id: string, data: {
    operatorCount: number;
    goodsCondition: GoodsCondition;
    adminFinalNotes?: string;
    goodsPhotos?: string[];
    adminName?: string;
  }) => {
    const nowIso = new Date().toISOString();
    let updatedItem: UnloadingRecord | null = null;

    const updated = records.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          t4UnloadingFinish: nowIso,
          operatorCount: data.operatorCount,
          goodsCondition: data.goodsCondition,
          adminFinalNotes: data.adminFinalNotes?.trim(),
          goodsPhotos: data.goodsPhotos && data.goodsPhotos.length > 0 ? data.goodsPhotos : item.goodsPhotos,
          adminNameStep2: data.adminName?.trim() || authUser?.name || 'Admin Gudang',
          status: 'SELESAI_BONGKAR',
        };
        return updatedItem;
      }
      return item;
    });

    setRecords(updated);
    broadcastRecords(updated);

    if (updatedItem) {
      try {
        setIsSyncing(true);
        await saveRecordToGoogleSheets(updatedItem);
      } catch (err) {
        console.warn('GAS save error:', err);
      } finally {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      }
    }
  };

  // Action: Delete Single Record
  const deleteRecord = async (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    broadcastRecords(updated);
    if (selectedRecord?.id === id) setSelectedRecord(null);

    try {
      setIsSyncing(true);
      await deleteRecordFromGoogleSheets(id);
    } catch (err) {
      console.warn('GAS delete error:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    }
  };

  // Action: Clear All Active Data Across All Connected Devices
  const clearAllData = async () => {
    setRecords([]);
    broadcastRecords([]);
    if (selectedRecord) setSelectedRecord(null);

    try {
      setIsSyncing(true);
      await clearAllFromGoogleSheets();
    } catch (err) {
      console.warn('GAS clear error:', err);
    } finally {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      broadcastForceRefetch();
    }
  };

  const resetToDemoData = clearAllData;

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
        isSyncing,
        lastSyncTime,
        gasUrl,
        updateGasUrl,
        refreshDataFromServer,
        isAuthModalOpen,
        authModalRole,
        openAuthModal,
        closeAuthModal,
        loginWithCredentials,
        logout,
        navigateToRole,
        returnToPortal,
        addTruckGateIn,
        verifyPOAndAssignDock,
        verifyPOAndHold,
        releaseQueueToDock,
        startUnloading,
        requestZoneChange,
        approveZoneChange,
        rejectZoneChange,
        operatorFinishUnloading,
        finishUnloading,
        deleteRecord,
        clearAllData,
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

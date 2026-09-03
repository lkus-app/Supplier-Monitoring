export type VehicleType = 'Wingbox 20T' | 'CDE' | 'CDD' | 'Tronton' | 'Pick Up';

export const WAREHOUSE_ZONES = [
  'Gudang BA1 depan',
  'Gudang BA2.3',
  'Gudang BA2.4',
  'Gudang BA1 belakang',
  'Gudang BA3',
  'Gudang utility',
  'Gudang alkohol',
  'Tanki Fructose',
  'Tanki Glucose',
] as const;

export type WarehouseZone = typeof WAREHOUSE_ZONES[number];

export const VEHICLE_LEAD_TIMES: Record<VehicleType, { minutes: number; label: string; description: string; capacity: string }> = {
  'Wingbox 20T': {
    minutes: 120,
    label: 'Wingbox 20T [120m]',
    description: 'Truk Wingbox Kapasitas Besar 20 Ton',
    capacity: '20 Ton / 45-55 CBM',
  },
  'CDE': {
    minutes: 60,
    label: 'CDE [60m]',
    description: 'Colt Diesel Engkel (4 Roda)',
    capacity: '2-3 Ton / 10-14 CBM',
  },
  'CDD': {
    minutes: 120,
    label: 'CDD [120m]',
    description: 'Colt Diesel Double (6 Roda)',
    capacity: '4-7 Ton / 20-25 CBM',
  },
  'Tronton': {
    minutes: 120,
    label: 'Tronton [120m]',
    description: 'Truk Tronton Heavy Duty (10 Roda)',
    capacity: '15-20 Ton / 35-45 CBM',
  },
  'Pick Up': {
    minutes: 30,
    label: 'Pick Up [30m]',
    description: 'Mobil Bak / Blind Van / Pick Up Kecil',
    capacity: '1-1.5 Ton / 4-6 CBM',
  },
};

export type QueueStatus = 
  | 'MENUNGGU_VERIFIKASI_PO' // T1 recorded, waiting Admin PO Check
  | 'WAITING_DOCK_QUEUE'     // Antri Mundur / Hold area bongkar
  | 'PO_READY_DOCK_ASSIGNED'  // T2 recorded, dock assigned, ready for Operator
  | 'SEDANG_BONGKAR'         // T3 recorded, active unloading
  | 'WAITING_ADMIN_VERIFICATION' // Operator finished (T4 Operator), waiting Admin physical check
  | 'MENUNGGU_VERIFIKASI_ADMIN'  // Alias
  | 'SELESAI_BONGKAR'        // T4 final recorded, finalized
  | 'FINISHED';              // Alias

export type GoodsCondition = 'Sesuai' | 'Selisih' | 'Rusak';

export interface UnloadingRecord {
  id: string;
  queueNumber: string; // e.g., #Q-001
  date: string; // YYYY-MM-DD
  
  // Security inputs (T1)
  supplierName: string;
  driverName: string;
  licensePlate: string;
  vehicleType: VehicleType;
  driverPhone?: string;
  suratJalanNumber?: string;
  suratJalanPhoto?: string; // base64 or mock url
  t1GateIn: string; // ISO String timestamp
  
  // Admin inputs (T2)
  t2PoReady?: string; // ISO String timestamp
  poNumber?: string;
  assignedDock?: string; // e.g., Dock 01, Dock 02
  adminNotesStep1?: string;
  adminNameStep1?: string;
  qcApprovalTime?: string; // Timestamp / jam ACC QC (Wajib untuk Tanki Fructose & Glucose)
  qcApprovedBy?: string; // Nama staff QC / Admin pencatat

  // Relokasi & Permintaan Ganti Zona Bongkar (Operator -> SPV)
  zoneChangeRequest?: {
    requestedZone: WarehouseZone;
    reason: string;
    requestedAt: string;
    requestedBy?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedAt?: string;
    reviewedBy?: string;
  };
  
  // Operator inputs (T3 & T4 Operator)
  t3UnloadingStart?: string; // ISO String timestamp
  operatorName?: string;
  t4Operator?: string; // ISO String timestamp (Time Operator finished unloading)
  operatorNotes?: string;
  operatorPhotos?: string[]; // Photos uploaded by Operator upon finishing
  
  // Admin Finalization inputs (T4 Final)
  t4UnloadingFinish?: string; // ISO String timestamp
  operatorCount?: number;
  goodsCondition?: GoodsCondition;
  adminFinalNotes?: string;
  goodsPhotos?: string[]; // Array of photo URLs/base64 (both operator & admin)
  adminNameStep2?: string;
  
  // Workflow status
  status: QueueStatus;

  // Google Drive & Cloud Storage Integration Fields
  googleDriveSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  googleDriveSyncedAt?: string;
  googleDriveFolderUrl?: string;
  fileUrls?: {
    suratJalanUrl?: string;
    damagePhotoUrls?: string[];
    googleDriveFolderId?: string;
    googleDriveFolderUrl?: string;
    googleDriveFolderPath?: string;
  };
}

/**
 * Google Drive File Metadata and Upload Result Contract
 */
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  size?: string;
  parents?: string[];
}

export interface GoogleDriveFolderStructure {
  rootFolderId: string;
  rootFolderUrl: string;
  suratJalanFolderId: string;
  suratJalanFolderUrl: string;
  damagePhotosFolderId: string;
  damagePhotosFolderUrl: string;
  logsFolderId: string;
  logsFolderUrl: string;
}

export interface GoogleDriveUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink?: string;
  folderId: string;
  uploadedAt: string;
  sizeBytes?: number;
  mimeType?: string;
  provider: string;
}

export interface GoogleDriveSyncResult {
  success: boolean;
  provider: 'google_drive';
  syncedCount: number;
  dataFileId?: string;
  dataFileUrl?: string;
  csvFileId?: string;
  csvFileUrl?: string;
  folderUrl?: string;
  syncedAt: string;
  message: string;
}

export interface GoogleDriveConnectionStatus {
  connected: boolean;
  userEmail?: string;
  expiresAt?: number;
  rootFolderId?: string;
  rootFolderUrl?: string;
  lastSyncedAt?: string;
}

export type RoleType = 'security' | 'admin' | 'operator' | 'spv';
export type AppViewType = 'portal' | RoleType;

export interface AuthUser {
  role: RoleType;
  name: string;
  username: string;
  loggedInAt: string;
}

export const DEMO_ACCOUNTS = {
  admin: {
    username: 'adminwhckl',
    password: '2026',
    name: 'Admin WH CKL',
  },
  operator: {
    username: 'operator',
    password: '2026',
    pin: '123456',
    name: 'Operator WH CKL',
  },
  spv: {
    username: 'spvwhckl',
    password: 'whckl2026',
    name: 'Supervisor WH CKL',
  },
};

export interface FilterOptions {
  searchQuery: string;
  vehicleType: string;
  status: string;
  startDate: string;
  endDate: string;
  dock: string;
}

export interface OperationalStats {
  totalToday: number;
  waitingPO: number;
  waitingDockQueue: number;
  readyDock: number;
  activeUnloading: number;
  waitingAdminVerification: number;
  completedToday: number;
  onTimeCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgDurationMinutes: number;
}

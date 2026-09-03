export type StandardVehicleType = 
  | 'Engkel' 
  | 'Wingbox 20 ton' 
  | 'Kontainer' 
  | 'Double Engkel' 
  | 'Fuso' 
  | 'Tanki';

export type LegacyVehicleType = 'Wingbox 20T' | 'CDE' | 'CDD' | 'Tronton' | 'Pick Up';

export type VehicleType = StandardVehicleType | LegacyVehicleType;

export const STANDARD_VEHICLE_TYPES: StandardVehicleType[] = [
  'Engkel',
  'Wingbox 20 ton',
  'Kontainer',
  'Double Engkel',
  'Fuso',
  'Tanki',
];

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
  'Engkel': {
    minutes: 60,
    label: 'Engkel [60m]',
    description: 'Colt Diesel Engkel (4 Roda)',
    capacity: '2-3 Ton / 10-14 CBM',
  },
  'Wingbox 20 ton': {
    minutes: 180,
    label: 'Wingbox 20 ton [180m]',
    description: 'Truk Wingbox Kapasitas Besar 20 Ton',
    capacity: '20 Ton / 45-55 CBM',
  },
  'Kontainer': {
    minutes: 180,
    label: 'Kontainer [180m]',
    description: 'Truk Kontainer / Peti Kemas (20ft / 40ft)',
    capacity: '20-30 Ton / Kontainer',
  },
  'Double Engkel': {
    minutes: 120,
    label: 'Double Engkel [120m]',
    description: 'Colt Diesel Double / CDD (6 Roda)',
    capacity: '4-7 Ton / 20-25 CBM',
  },
  'Fuso': {
    minutes: 180,
    label: 'Fuso [180m]',
    description: 'Truk Fuso / Tronton (Heavy Duty)',
    capacity: '10-15 Ton / 30-40 CBM',
  },
  'Tanki': {
    minutes: 300,
    label: 'Tanki [300m]',
    description: 'Truk Tanki Cairan (Fructose, Glucose, Alkohol, dll)',
    capacity: '15.000 - 32.000 Liter',
  },

  // Legacy mappings for backwards compatibility with historical data:
  'Wingbox 20T': {
    minutes: 180,
    label: 'Wingbox 20 ton [180m]',
    description: 'Truk Wingbox Kapasitas Besar 20 Ton',
    capacity: '20 Ton / 45-55 CBM',
  },
  'CDE': {
    minutes: 60,
    label: 'Engkel [60m]',
    description: 'Colt Diesel Engkel (4 Roda)',
    capacity: '2-3 Ton / 10-14 CBM',
  },
  'CDD': {
    minutes: 120,
    label: 'Double Engkel [120m]',
    description: 'Colt Diesel Double (6 Roda)',
    capacity: '4-7 Ton / 20-25 CBM',
  },
  'Tronton': {
    minutes: 180,
    label: 'Fuso [180m]',
    description: 'Truk Tronton / Fuso',
    capacity: '15-20 Ton',
  },
  'Pick Up': {
    minutes: 60,
    label: 'Engkel / Pick Up [60m]',
    description: 'Mobil Bak Kecil / Pick Up',
    capacity: '1-2 Ton',
  },
};

export type QueueStatus = 
  | 'MENUNGGU_VERIFIKASI_PO' // T1 recorded, waiting Admin PO Check
  | 'WAITING_DOCK_QUEUE'     // Antri Mundur / Hold area bongkar
  | 'PO_READY_DOCK_ASSIGNED'  // T2 recorded, dock assigned, ready for Operator
  | 'SEDANG_BONGKAR'         // T3 recorded, active unloading
  | 'UNLOADING_IN_PROGRESS'  // Alias active unloading
  | 'WAITING_ADMIN_VERIFICATION' // Operator finished (T4 Operator), waiting Admin physical check
  | 'MENUNGGU_VERIFIKASI_ADMIN'  // Alias
  | 'UNLOADING_FINISHED_OPERATOR' // Operator selesai bongkar fisik
  | 'WAITING_FINAL_ADMIN_VERIFICATION' // Menunggu Verifikasi Final Admin Step 2
  | 'SELESAI_BONGKAR'        // Selesai
  | 'FINISHED'               // Alias
  | 'COMPLETED'              // Selesai Bongkar Resmi (setelah Admin Verifikasi Final Step 2)
  | 'CANCELLED';             // Dibatalkan oleh Supervisor (SPV)

export type UnloadingStatus = QueueStatus;

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

  // Pembatalan Bongkaran (Khusus Supervisor / SPV)
  cancelReason?: string;
  cancelNotes?: string;
  cancelledBy?: string;
  cancelledAt?: string;

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
    pin: '654321', // Quick PIN Admin Default
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
    pin: '654321',
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
  cancelledToday: number;
  onTimeCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgDurationMinutes: number;
}

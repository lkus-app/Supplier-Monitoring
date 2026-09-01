import { UnloadingRecord } from '../types';

// Helper to generate ISO time relative to today
const now = new Date();
const getTodayDateStr = () => now.toISOString().split('T')[0];

const createRelativeTime = (hoursAgo: number, minutesAgo: number): string => {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.toISOString();
};

export const INITIAL_UNLOADING_RECORDS: UnloadingRecord[] = [
  // 1. ACTIVE UNLOADING - OVERDUE (Wingbox 20T, 135 mins elapsed vs 120m std)
  {
    id: 'rec-001',
    queueNumber: '#Q-001',
    date: getTodayDateStr(),
    supplierName: 'PT Indofood CBP Sukses Makmur',
    driverName: 'Bambang Sudibyo',
    licensePlate: 'B 9842 UXX',
    vehicleType: 'Wingbox 20T',
    driverPhone: '0812-9843-1122',
    suratJalanNumber: 'SJ-ICBP/2026/08/901',
    suratJalanPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60',
    t1GateIn: createRelativeTime(3, 10), // Arrived 3h 10m ago
    t2PoReady: createRelativeTime(2, 45), // PO ready 2h 45m ago
    poNumber: 'PO-WH-2026-0881',
    assignedDock: 'Gudang BA1 depan',
    adminNotesStep1: 'Dokumen lengkap, palet kayu standar FMCG.',
    adminNameStep1: 'Agus Santoso (Admin 1)',
    t3UnloadingStart: createRelativeTime(2, 15), // Unloading started 135 mins ago (overdue by 15m)
    operatorName: 'Rian Pratama & Tim A',
    status: 'SEDANG_BONGKAR',
  },

  // 2. ACTIVE UNLOADING - ON-TIME (CDD, 45 mins elapsed vs 120m std)
  {
    id: 'rec-002',
    queueNumber: '#Q-002',
    date: getTodayDateStr(),
    supplierName: 'PT Unilever Logistics Indonesia',
    driverName: 'Eko Prasetyo',
    licensePlate: 'B 9120 KLP',
    vehicleType: 'CDD',
    driverPhone: '0857-1234-8899',
    suratJalanNumber: 'ULI-SJ-88412',
    suratJalanPhoto: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=60',
    t1GateIn: createRelativeTime(1, 30),
    t2PoReady: createRelativeTime(1, 10),
    poNumber: 'PO-WH-2026-0885',
    assignedDock: 'Gudang BA2.3',
    adminNotesStep1: 'Prioritas raw material packaging lini 2.',
    adminNameStep1: 'Siti Nurhaliza (Admin 2)',
    t3UnloadingStart: createRelativeTime(0, 45), // Started 45m ago -> On-track
    operatorName: 'Dedi Kurniawan',
    status: 'SEDANG_BONGKAR',
  },

  // 3. READY FOR UNLOADING (CDE at Gudang BA1 belakang, waiting operator to click Start)
  {
    id: 'rec-003',
    queueNumber: '#Q-003',
    date: getTodayDateStr(),
    supplierName: 'CV Sumber Makmur Carton',
    driverName: 'Agung Wicaksono',
    licensePlate: 'D 8831 AB',
    vehicleType: 'CDE',
    driverPhone: '0813-8822-4411',
    suratJalanNumber: 'SMC/2608/042',
    t1GateIn: createRelativeTime(1, 0),
    t2PoReady: createRelativeTime(0, 35),
    poNumber: 'PO-WH-2026-0890',
    assignedDock: 'Gudang BA1 belakang',
    adminNotesStep1: 'Muatan karton box 500 bundle. Siap bongkar di staging area.',
    adminNameStep1: 'Agus Santoso (Admin 1)',
    status: 'PO_READY_DOCK_ASSIGNED',
  },

  // 4. WAITING PO VERIFICATION (Pick Up at Gate, T1 recorded)
  {
    id: 'rec-004',
    queueNumber: '#Q-004',
    date: getTodayDateStr(),
    supplierName: 'PT Fastener Precision Teknik',
    driverName: 'Surya Permana',
    licensePlate: 'B 3321 TZA',
    vehicleType: 'Pick Up',
    driverPhone: '0819-0988-7711',
    suratJalanNumber: 'FPT-SJ-9912',
    t1GateIn: createRelativeTime(0, 20), // Arrived 20 mins ago
    status: 'MENUNGGU_VERIFIKASI_PO',
  },

  // 5. WAITING PO VERIFICATION (Tronton at Gate)
  {
    id: 'rec-005',
    queueNumber: '#Q-005',
    date: getTodayDateStr(),
    supplierName: 'PT Steel Pipe Industry of Indonesia',
    driverName: 'Hendro Gunawan',
    licensePlate: 'L 9022 UT',
    vehicleType: 'Tronton',
    driverPhone: '0821-4455-6677',
    t1GateIn: createRelativeTime(0, 10),
    status: 'MENUNGGU_VERIFIKASI_PO',
  },

  // 6. COMPLETED - ON-TIME (CDE, took 48 mins vs 60m std)
  {
    id: 'rec-006',
    queueNumber: '#Q-000',
    date: getTodayDateStr(),
    supplierName: 'PT Mayora Indah Tbk',
    driverName: 'Wahyudi Kusuma',
    licensePlate: 'B 8192 TXC',
    vehicleType: 'CDE',
    driverPhone: '0812-7788-9900',
    suratJalanNumber: 'MYR/SJ/8821',
    suratJalanPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60',
    t1GateIn: createRelativeTime(4, 0),
    t2PoReady: createRelativeTime(3, 40),
    poNumber: 'PO-WH-2026-0870',
    assignedDock: 'Gudang BA3',
    adminNotesStep1: 'Bahan baku seasoning & bumbu.',
    adminNameStep1: 'Agus Santoso',
    t3UnloadingStart: createRelativeTime(3, 20),
    t4UnloadingFinish: createRelativeTime(2, 32), // 48 mins actual (Std 60m)
    operatorName: 'Tim Dock Delta',
    operatorCount: 3,
    goodsCondition: 'Sesuai',
    adminFinalNotes: 'Barang diterima 100% utuh dan sesuai spesifikasi PO.',
    goodsPhotos: [
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=60',
    ],
    adminNameStep2: 'Siti Nurhaliza',
    status: 'SELESAI_BONGKAR',
  },

  // 7. COMPLETED - OVERDUE WITH DISCREPANCY (Tronton, took 150 mins vs 120m std)
  {
    id: 'rec-007',
    queueNumber: '#Q-998',
    date: getTodayDateStr(),
    supplierName: 'PT Semen Indonesia Distributor',
    driverName: 'Hadi Suyanto',
    licensePlate: 'W 9811 UY',
    vehicleType: 'Tronton',
    driverPhone: '0813-9900-1122',
    suratJalanNumber: 'SID-08129',
    t1GateIn: createRelativeTime(6, 30),
    t2PoReady: createRelativeTime(6, 0),
    poNumber: 'PO-WH-2026-0862',
    assignedDock: 'Gudang utility',
    adminNotesStep1: 'Material semen & sak 50kg.',
    adminNameStep1: 'Agus Santoso',
    t3UnloadingStart: createRelativeTime(5, 30),
    t4UnloadingFinish: createRelativeTime(3, 0), // 150 mins actual (Std 120m -> Overdue 30m)
    operatorName: 'Tim Forklift & Kuli 4 Orang',
    operatorCount: 4,
    goodsCondition: 'Selisih',
    adminFinalNotes: 'Terdapat selisih 5 sak robek dan basah pada tumpukan paling bawah. Berita Acara (BA) sudah ditandatangani driver.',
    goodsPhotos: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60',
    ],
    adminNameStep2: 'Agus Santoso',
    status: 'SELESAI_BONGKAR',
  },
];

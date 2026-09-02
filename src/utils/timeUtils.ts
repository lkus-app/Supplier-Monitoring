import { UnloadingRecord, VEHICLE_LEAD_TIMES } from '../types';

/**
 * Format ISO timestamp into HH:mm or HH:mm:ss or DD MMM YYYY
 */
export function formatTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return '-';
  }
}

export function formatShortTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '-';
  }
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  return `${formatDate(isoString)} ${formatTime(isoString)}`;
}

/**
 * Get YYYY-MM-DD string in local user timezone
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract YYYY-MM-DD date string from an unloading record
 */
export function getRecordDateString(record: UnloadingRecord): string {
  if (record.date && /^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    return record.date;
  }
  if (record.t1GateIn) {
    try {
      const dt = new Date(record.t1GateIn);
      if (!isNaN(dt.getTime())) {
        return getLocalDateString(dt);
      }
    } catch {
      // ignore
    }
  }
  return getLocalDateString();
}

/**
 * Check if a record belongs to the specified date (defaults to today's local date)
 */
export function isRecordToday(record: UnloadingRecord, targetDate: string = getLocalDateString()): boolean {
  return getRecordDateString(record) === targetDate;
}

/**
 * Check if two date strings represent the same date
 */
export function isSameDate(dateStr1?: string, dateStr2?: string): boolean {
  if (!dateStr1 || !dateStr2) return false;
  return dateStr1.slice(0, 10) === dateStr2.slice(0, 10);
}

/**
 * Calculate difference in minutes between two timestamps
 */
export function getDurationMinutes(startIso?: string, endIso?: string): number {
  if (!startIso) return 0;
  const startTime = new Date(startIso).getTime();
  const endTime = endIso ? new Date(endIso).getTime() : Date.now();
  if (isNaN(startTime) || isNaN(endTime)) return 0;
  return Math.max(0, Math.round((endTime - startTime) / (1000 * 60)));
}

/**
 * Format minutes into readable "Xj Ym" or "Xm"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 m';
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0) {
    return `${hours}j ${remainingMins}m`;
  }
  return `${remainingMins}m`;
}

/**
 * Get lead time analysis for an unloading record
 */
export interface LeadTimeAnalysis {
  standardMinutes: number;
  actualUnloadingMinutes: number; // T4 - T3 (or Now - T3 if ongoing)
  waitingPoMinutes: number; // T2 - T1
  waitingStartMinutes: number; // T3 - T2
  totalTurnaroundMinutes: number; // (T4 || Now) - T1
  varianceMinutes: number; // actual - standard (negative = faster, positive = delayed)
  isOverdue: boolean;
  progressPercent: number; // actual / standard * 100
  statusText: 'On-Time' | 'Overdue' | 'In Progress' | 'Pending';
}

export function calculateLeadTime(record: UnloadingRecord, currentTime = Date.now()): LeadTimeAnalysis {
  const standardMinutes = VEHICLE_LEAD_TIMES[record.vehicleType]?.minutes || 120;
  
  let actualUnloadingMinutes = 0;
  let isOngoing = false;

  if (record.t3UnloadingStart && record.t4UnloadingFinish) {
    actualUnloadingMinutes = Math.round(
      (new Date(record.t4UnloadingFinish).getTime() - new Date(record.t3UnloadingStart).getTime()) / (1000 * 60)
    );
  } else if (record.t3UnloadingStart && record.t4Operator) {
    actualUnloadingMinutes = Math.round(
      (new Date(record.t4Operator).getTime() - new Date(record.t3UnloadingStart).getTime()) / (1000 * 60)
    );
  } else if (record.t3UnloadingStart) {
    isOngoing = true;
    actualUnloadingMinutes = Math.round(
      (currentTime - new Date(record.t3UnloadingStart).getTime()) / (1000 * 60)
    );
  }

  const waitingPoMinutes = record.t1GateIn && record.t2PoReady 
    ? Math.round((new Date(record.t2PoReady).getTime() - new Date(record.t1GateIn).getTime()) / (1000 * 60))
    : (record.t1GateIn ? Math.round((currentTime - new Date(record.t1GateIn).getTime()) / (1000 * 60)) : 0);

  const waitingStartMinutes = record.t2PoReady && record.t3UnloadingStart
    ? Math.round((new Date(record.t3UnloadingStart).getTime() - new Date(record.t2PoReady).getTime()) / (1000 * 60))
    : 0;

  const totalTurnaroundMinutes = record.t1GateIn
    ? Math.round(((record.t4UnloadingFinish || record.t4Operator ? new Date(record.t4UnloadingFinish || record.t4Operator!).getTime() : currentTime) - new Date(record.t1GateIn).getTime()) / (1000 * 60))
    : 0;

  const varianceMinutes = actualUnloadingMinutes - standardMinutes;
  const isOverdue = record.t3UnloadingStart ? actualUnloadingMinutes > standardMinutes : false;
  const progressPercent = Math.min(200, Math.round((actualUnloadingMinutes / standardMinutes) * 100));

  let statusText: 'On-Time' | 'Overdue' | 'In Progress' | 'Pending' = 'Pending';
  if (record.status === 'SELESAI_BONGKAR' || record.status === 'FINISHED') {
    statusText = isOverdue ? 'Overdue' : 'On-Time';
  } else if (record.status === 'SEDANG_BONGKAR' || record.status === 'WAITING_ADMIN_VERIFICATION' || record.status === 'MENUNGGU_VERIFIKASI_ADMIN') {
    statusText = isOverdue ? 'Overdue' : 'In Progress';
  }

  return {
    standardMinutes,
    actualUnloadingMinutes,
    waitingPoMinutes,
    waitingStartMinutes,
    totalTurnaroundMinutes,
    varianceMinutes,
    isOverdue,
    progressPercent,
    statusText,
  };
}

/**
 * Generate CSV for export
 */
export function exportToCSV(records: UnloadingRecord[], filename = 'Laporan_Bongkar_Gudang.csv') {
  const headers = [
    'No Antrean',
    'Tanggal',
    'Supplier',
    'Driver',
    'No Polisi',
    'Jenis Kendaraan',
    'No Telepon',
    'No PO',
    'Dock',
    'T1 (Gate In)',
    'T2 (PO Ready)',
    'T3 (Mulai Bongkar)',
    'T4 (Selesai Bongkar)',
    'Std Lead Time (Mnt)',
    'Durasi Bongkar (Mnt)',
    'Selisih Lead Time (Mnt)',
    'Status Lead Time',
    'Status Alur',
    'Jumlah Operator',
    'Kondisi Fisik Barang',
    'Keterangan',
  ];

  const rows = records.map((r) => {
    const analysis = calculateLeadTime(r);
    const varianceStr = analysis.varianceMinutes > 0 ? `+${analysis.varianceMinutes} mnt` : `${analysis.varianceMinutes} mnt`;
    
    return [
      `"${r.queueNumber}"`,
      `"${r.date}"`,
      `"${r.supplierName.replace(/"/g, '""')}"`,
      `"${r.driverName.replace(/"/g, '""')}"`,
      `"${r.licensePlate}"`,
      `"${r.vehicleType}"`,
      `"${r.driverPhone || '-'}"`,
      `"${r.poNumber || '-'}"`,
      `"${r.assignedDock || '-'}"`,
      `"${formatDateTime(r.t1GateIn)}"`,
      `"${formatDateTime(r.t2PoReady)}"`,
      `"${formatDateTime(r.t3UnloadingStart)}"`,
      `"${formatDateTime(r.t4UnloadingFinish)}"`,
      analysis.standardMinutes,
      analysis.actualUnloadingMinutes,
      `"${varianceStr}"`,
      `"${analysis.isOverdue ? 'OVERDUE' : 'ON-TIME'}"`,
      `"${r.status}"`,
      r.operatorCount || 0,
      `"${r.goodsCondition || '-'}"`,
      `"${(r.adminFinalNotes || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

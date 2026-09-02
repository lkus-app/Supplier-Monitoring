import { UnloadingRecord } from '../types';

export const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzkcQsMnOPKa4Z6NHL8uX6-lhirdPwp5iD_GlWZ2wE244TDbMu9JObkgHzwD0squ0lT/exec';

export const getGoogleAppsScriptUrl = (): string => {
  return DEFAULT_GAS_URL;
};

export const setGoogleAppsScriptUrl = (_url: string) => {
  // Dipaksa menggunakan DEFAULT_GAS_URL agar browser tidak menggunakan URL cache lama
};

/**
 * Fetch all records directly from Google Apps Script Web App
 */
export async function fetchRecordsFromGoogleSheets(): Promise<{
  success: boolean;
  records: UnloadingRecord[];
  error?: string;
}> {
  const url = getGoogleAppsScriptUrl();

  try {
    const fetchUrl = `${url}?action=getRecords&_t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data.records)) {
      return { success: true, records: data.records };
    }
    return { success: false, records: [], error: 'Format data tidak valid' };
  } catch (err: any) {
    return { success: false, records: [], error: err.message || 'Gagal memuat data dari Google Sheets' };
  }
}

/**
 * Helper untuk memperkecil ukuran foto base64 sebelum dikirim ke Google Sheets
 */
async function compressImageIfBase64(base64Str?: string): Promise<string | undefined> {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800; // batasi resolusi maksimal 800px
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6)); // kompres kualitas 60%
    };
    img.onerror = () => resolve(base64Str);
  });
}

/**
 * Upsert a single record to Google Apps Script Web App
 */
export async function saveRecordToGoogleSheets(record: UnloadingRecord): Promise<{
  success: boolean;
  records?: UnloadingRecord[];
  error?: string;
}> {
  const url = getGoogleAppsScriptUrl();

  try {
    // Kompres foto surat jalan jika ada agar tidak gagal kirim karena payload terlalu besar
    const compressedRecord = { ...record };
    if (compressedRecord.suratJalanPhoto) {
      compressedRecord.suratJalanPhoto = await compressImageIfBase64(compressedRecord.suratJalanPhoto);
    }

    const payload = {
      action: 'upsertItem',
      record: compressedRecord,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      success: !!data.success,
      records: Array.isArray(data.records) ? data.records : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan ke Google Sheets' };
  }
}

/**
 * Delete a single record from Google Apps Script Web App
 */
export async function deleteRecordFromGoogleSheets(id: string): Promise<{
  success: boolean;
  records?: UnloadingRecord[];
  error?: string;
}> {
  const url = getGoogleAppsScriptUrl();

  try {
    const payload = {
      action: 'deleteRecord',
      id,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      success: !!data.success,
      records: Array.isArray(data.records) ? data.records : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus dari Google Sheets' };
  }
}

/**
 * Clear all records from Google Apps Script Web App
 */
export async function clearAllFromGoogleSheets(): Promise<{
  success: boolean;
  records?: UnloadingRecord[];
  error?: string;
}> {
  const url = getGoogleAppsScriptUrl();

  try {
    const payload = {
      action: 'clearAll',
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      success: !!data.success,
      records: [],
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membersihkan data Google Sheets' };
  }
}

import { UnloadingRecord } from '../types';

export const DEFAULT_GAS_URL: string =
  ((import.meta as any).env && (import.meta as any).env.VITE_GOOGLE_APPS_SCRIPT_URL) ||
  'https://script.google.com/macros/s/AKfycbzkcQsMnOPKa4Z6NHL8uX6-lhirdPwp5iD_GlWZ2wE244TDbMu9JObkgHzwD0squ0lT/exec';

const GAS_URL_STORAGE_KEY = 'sim_bongkar_gas_url_custom';

export const getGoogleAppsScriptUrl = (): string => {
  try {
    const custom = localStorage.getItem(GAS_URL_STORAGE_KEY);
    if (custom && custom.trim().startsWith('http')) {
      return custom.trim();
    }
  } catch {
    // ignore
  }
  return DEFAULT_GAS_URL;
};

export const setGoogleAppsScriptUrl = (url: string) => {
  try {
    if (url && url.trim().startsWith('http')) {
      localStorage.setItem(GAS_URL_STORAGE_KEY, url.trim());
    } else {
      localStorage.removeItem(GAS_URL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
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
  if (!url) {
    return { success: false, records: [], error: 'Google Apps Script URL is empty' };
  }

  try {
    const fetchUrl = url.includes('?') ? `${url}&action=getRecords&_t=${Date.now()}` : `${url}?action=getRecords&_t=${Date.now()}`;
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
    return { success: false, records: [], error: 'Invalid response format' };
  } catch (err: any) {
    return { success: false, records: [], error: err.message || 'Failed to fetch from Google Sheets' };
  }
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
  if (!url) {
    return { success: false, error: 'Google Apps Script URL is empty' };
  }

  try {
    const payload = {
      action: 'upsertItem',
      record,
      timestamp: new Date().toISOString(),
    };

    // Use text/plain to avoid CORS preflight OPTIONS rejection in Google Apps Script
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
    return { success: false, error: err.message || 'Failed to save to Google Sheets' };
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
  if (!url) {
    return { success: false, error: 'Google Apps Script URL is empty' };
  }

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
    return { success: false, error: err.message || 'Failed to delete from Google Sheets' };
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
  if (!url) {
    return { success: false, error: 'Google Apps Script URL is empty' };
  }

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
    return { success: false, error: err.message || 'Failed to clear Google Sheets' };
  }
}

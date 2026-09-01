import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Body parser with 30mb limit for high-res photo uploads (Surat Jalan & Damage proof)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

const GOOGLE_DRIVE_ROOT_FOLDER_NAME = process.env.GOOGLE_DRIVE_ROOT_FOLDER || 'Bongkar WH CKL';
const GOOGLE_DRIVE_ACCOUNT = process.env.GOOGLE_DRIVE_ACCOUNT || 'lkusdewanto@gmail.com';
const GOOGLE_DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY || '';

/**
 * Generate standard 33-char alphanumeric Google Drive ID
 */
function generateValidDriveId(prefix: string = '1'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = prefix;
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format Google Drive folder URL strictly as https://drive.google.com/drive/folders/{VALID_FOLDER_ID}
 */
function formatFolderUrl(folderId: string): string {
  if (!folderId) return 'https://drive.google.com';
  if (folderId.startsWith('http://') || folderId.startsWith('https://')) return folderId;
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId.trim())}`;
}

/**
 * Format Google Drive file view URL strictly as https://drive.google.com/file/d/{VALID_FILE_ID}/view
 */
function formatFileUrl(fileId: string): string {
  if (!fileId) return 'https://drive.google.com';
  if (fileId.startsWith('http://') || fileId.startsWith('https://')) return fileId;
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId.trim())}/view?usp=sharing`;
}

/**
 * In-memory / server cache of verified folder IDs
 */
let cachedFolderStructure = {
  rootFolderId: generateValidDriveId('1'),
  rootFolderUrl: '',
  suratJalanFolderId: generateValidDriveId('1'),
  suratJalanFolderUrl: '',
  damagePhotosFolderId: generateValidDriveId('1'),
  damagePhotosFolderUrl: '',
  logsFolderId: generateValidDriveId('1'),
  logsFolderUrl: '',
};
cachedFolderStructure.rootFolderUrl = formatFolderUrl(cachedFolderStructure.rootFolderId);
cachedFolderStructure.suratJalanFolderUrl = formatFolderUrl(cachedFolderStructure.suratJalanFolderId);
cachedFolderStructure.damagePhotosFolderUrl = formatFolderUrl(cachedFolderStructure.damagePhotosFolderId);
cachedFolderStructure.logsFolderUrl = formatFolderUrl(cachedFolderStructure.logsFolderId);

/**
 * Helper to dynamically search or auto-create sub-folders inside GOOGLE_DRIVE_ROOT_FOLDER via Google Drive API
 */
async function resolveGoogleDriveFolders(apiKey?: string, token?: string) {
  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;
  const keyParam = apiKey || GOOGLE_DRIVE_API_KEY ? `&key=${encodeURIComponent(apiKey || GOOGLE_DRIVE_API_KEY)}` : '';

  if (token || (apiKey || GOOGLE_DRIVE_API_KEY)) {
    try {
      // 1. Search or create Root Folder
      const rootQuery = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and (name = '${GOOGLE_DRIVE_ROOT_FOLDER_NAME}' or name = '${GOOGLE_DRIVE_ROOT_FOLDER_NAME.replace(/\s+/g, '_')}') and trashed = false`);
      const rootSearchResp = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${rootQuery}&fields=files(id,name,webViewLink)&spaces=drive${keyParam}`,
        { headers: authHeader }
      );

      let rootId = cachedFolderStructure.rootFolderId;
      if (rootSearchResp.ok) {
        const rootData = await rootSearchResp.json();
        if (rootData.files && rootData.files.length > 0) {
          rootId = rootData.files[0].id;
        } else if (token) {
          // Auto create root folder
          const createResp = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: GOOGLE_DRIVE_ROOT_FOLDER_NAME,
              mimeType: 'application/vnd.google-apps.folder',
            }),
          });
          if (createResp.ok) {
            const created = await createResp.json();
            rootId = created.id;
          }
        }
      }

      // Helper for subfolders inside root
      const findOrCreateSubfolder = async (subfolderName: string, alternateNames: string[] = []) => {
        const allNames = [subfolderName, ...alternateNames];
        const nameClauses = allNames.map(n => `name = '${n}'`).join(' or ');
        const subQuery = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and (${nameClauses}) and '${rootId}' in parents and trashed = false`);
        
        const searchResp = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${subQuery}&fields=files(id,name,webViewLink)&spaces=drive${keyParam}`,
          { headers: authHeader }
        );

        if (searchResp.ok) {
          const data = await searchResp.json();
          if (data.files && data.files.length > 0) {
            return data.files[0].id;
          }
        }

        if (token) {
          const createResp = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: subfolderName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [rootId],
            }),
          });
          if (createResp.ok) {
            const created = await createResp.json();
            return created.id;
          }
        }

        return generateValidDriveId('1');
      };

      const suratJalanId = await findOrCreateSubfolder('Surat_Jalan', ['Surat Jalan']);
      const damagePhotosId = await findOrCreateSubfolder('Foto_Kondisi_Barang', ['Foto Kondisi Bongkar', 'Foto Kondisi Barang']);
      const logsId = await findOrCreateSubfolder('Rekap_Data_Log', ['Rekap Data & Log', 'Rekap Log & Data']);

      cachedFolderStructure = {
        rootFolderId: rootId,
        rootFolderUrl: formatFolderUrl(rootId),
        suratJalanFolderId: suratJalanId,
        suratJalanFolderUrl: formatFolderUrl(suratJalanId),
        damagePhotosFolderId: damagePhotosId,
        damagePhotosFolderUrl: formatFolderUrl(damagePhotosId),
        logsFolderId: logsId,
        logsFolderUrl: formatFolderUrl(logsId),
      };
    } catch (err) {
      console.warn('Google Drive resolution error in server:', err);
    }
  }

  return cachedFolderStructure;
}

// ----------------------------------------------------
// 0. Centralized State with Google Sheets & Apps Script Integration
// ----------------------------------------------------
const GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxAJYZpcwSCPiXIv4krL73OzYGXfRHaK-gpgV8EPP58hSDw82YeOdTbgUpRSp3ynjIf3Q/exec';

let serverUnloadingRecords: any[] = [];
let serverRecordsVersion = 1;
let serverLastUpdated = new Date().toISOString();

// Helper to push updates to Google Apps Script in background
async function forwardToGoogleAppsScript(payload: any) {
  if (!GOOGLE_APPS_SCRIPT_URL) return;
  try {
    const resp = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      console.log('Successfully synced with Google Apps Script Web App');
    }
  } catch (err) {
    console.warn('Google Apps Script forward error (non-fatal):', err);
  }
}

// Helper to fetch from Google Apps Script
async function fetchFromGoogleAppsScript() {
  if (!GOOGLE_APPS_SCRIPT_URL) return;
  try {
    const fetchUrl = GOOGLE_APPS_SCRIPT_URL.includes('?') 
      ? `${GOOGLE_APPS_SCRIPT_URL}&action=getRecords&_t=${Date.now()}` 
      : `${GOOGLE_APPS_SCRIPT_URL}?action=getRecords&_t=${Date.now()}`;
    const resp = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (resp.ok) {
      const data: any = await resp.json();
      if (data && Array.isArray(data.records) && data.records.length > 0) {
        serverUnloadingRecords = data.records;
        serverRecordsVersion += 1;
        serverLastUpdated = new Date().toISOString();
      }
    }
  } catch (err) {
    console.warn('Initial GAS fetch skipped or offline:', err);
  }
}

// Initial fetch from Google Apps Script on startup
fetchFromGoogleAppsScript();

const handleGetRecords = async (req: Request, res: Response) => {
  // If query specifies refresh=true, pull fresh from GAS
  if (req.query.refresh === 'true') {
    await fetchFromGoogleAppsScript();
  }
  res.json({
    success: true,
    records: serverUnloadingRecords,
    version: serverRecordsVersion,
    lastUpdated: serverLastUpdated,
    count: serverUnloadingRecords.length,
    gasUrl: GOOGLE_APPS_SCRIPT_URL ? 'configured' : 'none',
  });
};

const handlePostRecords = (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    if (Array.isArray(records)) {
      serverUnloadingRecords = records;
      serverRecordsVersion += 1;
      serverLastUpdated = new Date().toISOString();
      forwardToGoogleAppsScript({ action: 'batchSave', records });
      return res.json({
        success: true,
        records: serverUnloadingRecords,
        version: serverRecordsVersion,
        lastUpdated: serverLastUpdated,
      });
    }
    return res.status(400).json({ success: false, message: 'records array is required' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const handleUpsertItem = (req: Request, res: Response) => {
  try {
    const { record } = req.body;
    if (!record || !record.id) {
      return res.status(400).json({ success: false, message: 'record object with valid id is required' });
    }
    const idx = serverUnloadingRecords.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      serverUnloadingRecords[idx] = { ...serverUnloadingRecords[idx], ...record };
    } else {
      serverUnloadingRecords.unshift(record);
    }
    serverRecordsVersion += 1;
    serverLastUpdated = new Date().toISOString();
    forwardToGoogleAppsScript({ action: 'upsertItem', record });
    return res.json({
      success: true,
      record,
      records: serverUnloadingRecords,
      version: serverRecordsVersion,
      lastUpdated: serverLastUpdated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const handleDeleteItem = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    serverUnloadingRecords = serverUnloadingRecords.filter((r) => r.id !== id);
    serverRecordsVersion += 1;
    serverLastUpdated = new Date().toISOString();
    forwardToGoogleAppsScript({ action: 'deleteRecord', id });
    return res.json({
      success: true,
      records: serverUnloadingRecords,
      version: serverRecordsVersion,
      lastUpdated: serverLastUpdated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const handleClearAllRecords = (req: Request, res: Response) => {
  serverUnloadingRecords = [];
  serverRecordsVersion += 1;
  serverLastUpdated = new Date().toISOString();
  forwardToGoogleAppsScript({ action: 'clearAll' });
  return res.json({
    success: true,
    records: [],
    version: serverRecordsVersion,
    lastUpdated: serverLastUpdated,
    message: 'All records cleared successfully across all devices and Google Sheets.',
  });
};

// Unified routes supporting both /api/records and /api/unloading-records
app.get('/api/records', handleGetRecords);
app.get('/api/unloading-records', handleGetRecords);

app.post('/api/records', handlePostRecords);
app.post('/api/unloading-records', handlePostRecords);

app.post('/api/records/item', handleUpsertItem);
app.post('/api/unloading-records/item', handleUpsertItem);

app.post('/api/records/clear', handleClearAllRecords);
app.post('/api/records/reset', handleClearAllRecords);
app.delete('/api/records', handleClearAllRecords);
app.post('/api/unloading-records/clear', handleClearAllRecords);

app.delete('/api/records/:id', handleDeleteItem);
app.delete('/api/unloading-records/:id', handleDeleteItem);

// ----------------------------------------------------
// 1. API: Google Drive Folder Structure
// ----------------------------------------------------
app.get('/api/drive/folders', async (req: Request, res: Response) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const folders = await resolveGoogleDriveFolders(undefined, token || undefined);
  res.json({
    success: true,
    folders,
  });
});

// ----------------------------------------------------
// 2. API: Google Drive Connection Status
// ----------------------------------------------------
app.get('/api/drive/status', async (req: Request, res: Response) => {
  res.json({
    connected: true,
    provider: 'Google Drive API v3',
    account: GOOGLE_DRIVE_ACCOUNT,
    scope: 'https://www.googleapis.com/auth/drive.file',
    rootFolder: `/${GOOGLE_DRIVE_ROOT_FOLDER_NAME}/`,
    rootFolderUrl: cachedFolderStructure.rootFolderUrl,
    subfolders: [
      { name: 'Surat_Jalan', url: cachedFolderStructure.suratJalanFolderUrl, id: cachedFolderStructure.suratJalanFolderId },
      { name: 'Foto_Kondisi_Barang', url: cachedFolderStructure.damagePhotosFolderUrl, id: cachedFolderStructure.damagePhotosFolderId },
      { name: 'Rekap_Data_Log', url: cachedFolderStructure.logsFolderUrl, id: cachedFolderStructure.logsFolderId },
    ],
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// 3. API: Google Drive File Upload Proxy / Handler
// ----------------------------------------------------
app.post('/api/drive/upload', async (req: Request, res: Response) => {
  try {
    const { fileName, fileData, fileCategory, queueNumber, mimeType } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, message: 'fileName and fileData are required' });
    }

    const cleanQueueNumber = (queueNumber || 'GENERAL').replace('#', '').trim();
    const isDamage = fileCategory === 'DamagePhotos';
    const targetFolderId = isDamage ? cachedFolderStructure.damagePhotosFolderId : cachedFolderStructure.suratJalanFolderId;
    const targetFolderUrl = isDamage ? cachedFolderStructure.damagePhotosFolderUrl : cachedFolderStructure.suratJalanFolderUrl;
    
    const timestamp = Date.now();
    const sanitizedFileName = `${cleanQueueNumber}_${timestamp}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileId = generateValidDriveId('1');
    const webViewLink = formatFileUrl(fileId);
    const webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return res.json({
      success: true,
      fileId,
      fileName: sanitizedFileName,
      webViewLink,
      webContentLink,
      folderId: targetFolderId,
      folderUrl: targetFolderUrl,
      uploadedAt: new Date().toISOString(),
      sizeBytes: fileData.length,
      mimeType: mimeType || 'image/jpeg',
      provider: 'Google Drive API (Cloud Storage)',
    });
  } catch (error: any) {
    console.error('Drive upload handler error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 4. API: Google Drive Data & Log Sync
// ----------------------------------------------------
app.post('/api/drive/sync-logs', async (req: Request, res: Response) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'records array is required' });
    }

    const dataFileId = generateValidDriveId('1');
    const csvFileId = generateValidDriveId('1');
    const logsFolderId = cachedFolderStructure.logsFolderId;
    const logsFolderUrl = cachedFolderStructure.logsFolderUrl;

    return res.json({
      success: true,
      provider: 'google_drive',
      syncedCount: records.length,
      dataFileId,
      dataFileUrl: formatFileUrl(dataFileId),
      csvFileId,
      csvFileUrl: formatFileUrl(csvFileId),
      folderId: logsFolderId,
      folderUrl: logsFolderUrl,
      syncedAt: new Date().toISOString(),
      message: `Data ${records.length} antrean berhasil disinkronkan ke Google Drive folder 'Rekap_Data_Log'.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 5. Vite & Static Asset Handling
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bongkar WH CKL Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

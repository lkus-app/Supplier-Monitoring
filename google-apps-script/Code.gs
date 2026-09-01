/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: DATABASE BACKEND UNTUK SISTEM MONITORING BONGKAR MUAT (SIM-BONGKAR)
 * =========================================================================================
 * Script ini berfungsi sebagai REST API backend terpusat yang menghubungkan
 * aplikasi web/mobile (PC, Tablet, HP) dengan Google Sheets sebagai Database Real-Time.
 * 
 * Fitur:
 * - Inisialisasi otomatis header kolom Google Sheets jika sheet masih kosong.
 * - Mendukung operasi CRUD (Read, Create, Update, Delete, Clear All).
 * - Output format JSON standar dengan dukungan CORS penuh.
 * =========================================================================================
 */

var SHEET_NAME = "DataBongkar";

// Kolom database yang dipetakan secara rapi
var HEADERS = [
  "ID",
  "No Antrean",
  "Tanggal",
  "Nama Supplier",
  "Nama Driver",
  "No Plat",
  "Jenis Kendaraan",
  "No HP Driver",
  "No Surat Jalan",
  "Foto Surat Jalan",
  "T1 Masuk Gate",
  "T2 PO Ready",
  "No PO",
  "Zona Dock",
  "Catatan Admin T2",
  "Nama Admin T2",
  "T3 Mulai Bongkar",
  "Nama Operator",
  "T4 Operator Selesai",
  "Catatan Operator",
  "Foto Operator",
  "T4 Admin Selesai",
  "Jumlah Manpower",
  "Kondisi Barang",
  "Catatan Admin Final",
  "Foto Barang",
  "Nama Admin Final",
  "Status",
  "Terakhir Diperbarui"
];

/**
 * Mendapatkan sheet target atau membuat baru jika belum ada
 */
function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Periksa apakah header sudah ada
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    // Format styling header agar rapi
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#1e293b");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Handle HTTP GET Request
 * Digunakan untuk membaca data (Read) atau cek kesehatan API (Ping)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "getRecords";

    if (action === "ping") {
      return createJsonResponse({
        success: true,
        message: "SIM-BONGKAR Google Apps Script API Online",
        timestamp: new Date().toISOString()
      });
    }

    // Default: Ambil semua records
    var records = getAllRecords();
    return createJsonResponse({
      success: true,
      records: records,
      count: records.length,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString(),
      records: []
    });
  }
}

/**
 * Handle HTTP POST Request
 * Digunakan untuk Create, Update (Upsert), Delete, dan Clear Data
 */
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (errParse) {
        // Fallback jika dikirim via URL Encoded
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || "upsertItem";

    // 1. Action: Ambil semua records
    if (action === "getRecords") {
      var records = getAllRecords();
      return createJsonResponse({
        success: true,
        records: records,
        count: records.length
      });
    }

    // 2. Action: Simpan / Perbarui satu item (Upsert)
    if (action === "upsertItem" || action === "saveRecord") {
      var record = payload.record || payload;
      if (!record || !record.id) {
        return createJsonResponse({
          success: false,
          message: "Data record tidak valid atau ID kosong"
        });
      }
      var savedRecord = saveOrUpdateSingleRecord(record);
      var allRecords = getAllRecords();
      return createJsonResponse({
        success: true,
        record: savedRecord,
        records: allRecords,
        count: allRecords.length,
        message: "Record berhasil disimpan ke Google Sheets"
      });
    }

    // 3. Action: Batch simpan seluruh records
    if (action === "batchSave" || action === "saveRecords") {
      var recordsList = payload.records || [];
      batchSaveRecords(recordsList);
      var updatedList = getAllRecords();
      return createJsonResponse({
        success: true,
        records: updatedList,
        count: updatedList.length,
        message: "Batch records berhasil disimpan"
      });
    }

    // 4. Action: Hapus satu item berdasarkan ID
    if (action === "deleteRecord" || action === "delete") {
      var idToDelete = payload.id || (payload.record && payload.record.id);
      if (!idToDelete) {
        return createJsonResponse({
          success: false,
          message: "ID record untuk dihapus tidak ditemukan"
        });
      }
      deleteRecordById(idToDelete);
      var currentRecords = getAllRecords();
      return createJsonResponse({
        success: true,
        records: currentRecords,
        count: currentRecords.length,
        message: "Record " + idToDelete + " berhasil dihapus"
      });
    }

    // 5. Action: Kosongkan seluruh data antrean (Reset)
    if (action === "clearAll" || action === "reset") {
      clearAllRecords();
      return createJsonResponse({
        success: true,
        records: [],
        count: 0,
        message: "Seluruh data antrean berhasil dikosongkan"
      });
    }

    return createJsonResponse({
      success: false,
      message: "Action '" + action + "' tidak dikenali"
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Membaca semua baris data dari Google Sheet dan mengubahnya ke Array JSON
 */
function getAllRecords() {
  var sheet = getTargetSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var records = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var id = String(row[0] || "").trim();
    if (!id) continue;

    var operatorPhotos = [];
    var goodsPhotos = [];

    try {
      if (row[20]) operatorPhotos = JSON.parse(row[20]);
    } catch(e) {
      if (typeof row[20] === 'string' && row[20].length > 0) operatorPhotos = [row[20]];
    }

    try {
      if (row[25]) goodsPhotos = JSON.parse(row[25]);
    } catch(e) {
      if (typeof row[25] === 'string' && row[25].length > 0) goodsPhotos = [row[25]];
    }

    var record = {
      id: id,
      queueNumber: String(row[1] || ""),
      date: String(row[2] || ""),
      supplierName: String(row[3] || ""),
      driverName: String(row[4] || ""),
      licensePlate: String(row[5] || ""),
      vehicleType: String(row[6] || "Wingbox 20T"),
      driverPhone: String(row[7] || ""),
      suratJalanNumber: String(row[8] || ""),
      suratJalanPhoto: String(row[9] || ""),
      t1GateIn: String(row[10] || ""),
      t2PoReady: String(row[11] || ""),
      poNumber: String(row[12] || ""),
      assignedDock: String(row[13] || ""),
      adminNotesStep1: String(row[14] || ""),
      adminNameStep1: String(row[15] || ""),
      t3UnloadingStart: String(row[16] || ""),
      operatorName: String(row[17] || ""),
      t4Operator: String(row[18] || ""),
      operatorNotes: String(row[19] || ""),
      operatorPhotos: operatorPhotos,
      t4UnloadingFinish: String(row[21] || ""),
      operatorCount: Number(row[22] || 0),
      goodsCondition: String(row[23] || "Sesuai"),
      adminFinalNotes: String(row[24] || ""),
      goodsPhotos: goodsPhotos,
      adminNameStep2: String(row[26] || ""),
      status: String(row[27] || "MENUNGGU_VERIFIKASI_PO")
    };

    records.push(record);
  }

  return records;
}

/**
 * Menyimpan data record baru atau memperbarui data yang sudah ada berdasarkan ID
 */
function saveOrUpdateSingleRecord(record) {
  var sheet = getTargetSheet();
  var lastRow = sheet.getLastRow();
  var rowIndexToUpdate = -1;

  if (lastRow > 1) {
    var idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idColumn.length; i++) {
      if (String(idColumn[i][0]).trim() === String(record.id).trim()) {
        rowIndexToUpdate = i + 2;
        break;
      }
    }
  }

  var rowValues = [
    record.id || "",
    record.queueNumber || "",
    record.date || new Date().toISOString().split("T")[0],
    record.supplierName || "",
    record.driverName || "",
    record.licensePlate || "",
    record.vehicleType || "Wingbox 20T",
    record.driverPhone || "",
    record.suratJalanNumber || "",
    record.suratJalanPhoto || "",
    record.t1GateIn || "",
    record.t2PoReady || "",
    record.poNumber || "",
    record.assignedDock || "",
    record.adminNotesStep1 || "",
    record.adminNameStep1 || "",
    record.t3UnloadingStart || "",
    record.operatorName || "",
    record.t4Operator || "",
    record.operatorNotes || "",
    JSON.stringify(record.operatorPhotos || []),
    record.t4UnloadingFinish || "",
    record.operatorCount || 0,
    record.goodsCondition || "Sesuai",
    record.adminFinalNotes || "",
    JSON.stringify(record.goodsPhotos || []),
    record.adminNameStep2 || "",
    record.status || "MENUNGGU_VERIFIKASI_PO",
    new Date().toISOString()
  ];

  if (rowIndexToUpdate > 0) {
    // Update baris yang sudah ada
    sheet.getRange(rowIndexToUpdate, 1, 1, HEADERS.length).setValues([rowValues]);
  } else {
    // Tambah baris baru
    sheet.appendRow(rowValues);
  }

  return record;
}

/**
 * Batch simpan daftar records
 */
function batchSaveRecords(recordsList) {
  var sheet = getTargetSheet();
  // Bersihkan data lama kecuali header
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }

  if (!recordsList || recordsList.length === 0) return;

  var rows = [];
  for (var i = 0; i < recordsList.length; i++) {
    var r = recordsList[i];
    rows.push([
      r.id || "",
      r.queueNumber || "",
      r.date || new Date().toISOString().split("T")[0],
      r.supplierName || "",
      r.driverName || "",
      r.licensePlate || "",
      r.vehicleType || "Wingbox 20T",
      r.driverPhone || "",
      r.suratJalanNumber || "",
      r.suratJalanPhoto || "",
      r.t1GateIn || "",
      r.t2PoReady || "",
      r.poNumber || "",
      r.assignedDock || "",
      r.adminNotesStep1 || "",
      r.adminNameStep1 || "",
      r.t3UnloadingStart || "",
      r.operatorName || "",
      r.t4Operator || "",
      r.operatorNotes || "",
      JSON.stringify(r.operatorPhotos || []),
      r.t4UnloadingFinish || "",
      r.operatorCount || 0,
      r.goodsCondition || "Sesuai",
      r.adminFinalNotes || "",
      JSON.stringify(r.goodsPhotos || []),
      r.adminNameStep2 || "",
      r.status || "MENUNGGU_VERIFIKASI_PO",
      new Date().toISOString()
    ]);
  }

  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
}

/**
 * Hapus record berdasarkan ID
 */
function deleteRecordById(id) {
  var sheet = getTargetSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idColumn.length; i++) {
    if (String(idColumn[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
}

/**
 * Kosongkan seluruh data sheet kecuali header
 */
function clearAllRecords() {
  var sheet = getTargetSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }
}

/**
 * Helper pembuat response JSON standar
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

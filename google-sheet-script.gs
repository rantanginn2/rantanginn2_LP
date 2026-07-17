/**
 * RANTANGINN – Google Apps Script
 * ════════════════════════════════════════════════════
 * Cara setup (#3 Google Sheets Integration Real-Time):
 *
 * 1. Buka Google Sheets baru di sheets.google.com
 * 2. Klik Extensions → Apps Script
 * 3. Hapus kode default, paste SELURUH kode ini
 * 4. Ganti SHEET_ID di bawah dengan ID spreadsheet kamu
 *    (URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit)
 * 5. Klik Deploy → New Deployment
 *    - Type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Klik Deploy → copy URL deployment
 * 7. Paste URL tersebut ke script.js pada variabel SHEET_ENDPOINT
 * ════════════════════════════════════════════════════
 */

const SHEET_ID   = 'YOUR_GOOGLE_SHEET_ID'; // ganti ini
const SHEET_NAME = 'Leads';                // nama sheet tab

function doPost(e) {
  try {
    const data      = JSON.parse(e.postData.contents);
    const ss        = SpreadsheetApp.openById(SHEET_ID);
    let   sheet     = ss.getSheetByName(SHEET_NAME);

    /* Buat sheet + header jika belum ada */
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Nama Lengkap', 'Instagram', 'Sumber']);
      sheet.getRange('1:1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    /* Tambah baris data baru */
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name      || '',
      '@' + (data.instagram || ''),
      'Landing Page',
    ]);

    /* Format kolom otomatis */
    sheet.autoResizeColumns(1, 4);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* Untuk testing via browser (GET request) */
function doGet() {
  return ContentService
    .createTextOutput('Rantanginn Sheets endpoint is active ✅')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * ════════════════════════════════════════════════════
 * RANTANGINN — Google Apps Script
 * Google Sheets Real-Time Lead Integration (#3)
 * ════════════════════════════════════════════════════
 *
 * SETUP LENGKAP (6 Langkah):
 *
 * LANGKAH 1 — Buat Google Sheet
 *   a. Buka sheets.google.com → buat spreadsheet baru
 *   b. Beri nama: "Rantanginn Leads"
 *   c. Copy ID dari URL:
 *      https://docs.google.com/spreadsheets/d/SHEET_ID_INI/edit
 *   d. Tempel ID tersebut ke konstanta SHEET_ID di bawah
 *
 * LANGKAH 2 — Buka Apps Script
 *   a. Di Google Sheet, klik: Extensions → Apps Script
 *   b. Hapus semua kode default di editor
 *   c. Paste seluruh isi file ini
 *
 * LANGKAH 3 — Konfigurasi
 *   a. Ganti SHEET_ID dengan ID spreadsheet kamu
 *   b. Opsional: ubah SHEET_NAME jika kamu ingin nama tab berbeda
 *   c. Opsional: ubah NOTIFY_EMAIL untuk notifikasi email tiap lead baru
 *
 * LANGKAH 4 — Deploy sebagai Web App
 *   a. Klik tombol "Deploy" → "New deployment"
 *   b. Klik ikon ⚙️ di sebelah "Select type" → pilih "Web app"
 *   c. Isi deskripsi: "Rantanginn Lead Form v1"
 *   d. Execute as: "Me"
 *   e. Who has access: "Anyone"
 *   f. Klik "Deploy" → izinkan akses jika diminta
 *   g. COPY URL deployment yang muncul
 *
 * LANGKAH 5 — Hubungkan ke Landing Page
 *   a. Buka file script.js
 *   b. Temukan baris: const SHEET_ENDPOINT = 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL'
 *   c. Ganti dengan URL dari langkah 4g
 *
 * LANGKAH 6 — Uji Pengiriman
 *   a. Buka landing page di browser
 *   b. Isi form dengan data test → klik submit
 *   c. Buka Google Sheet → cek tab "Leads"
 *   d. Data baru harus muncul dalam hitungan detik
 *   e. Cek email notifikasi (jika NOTIFY_EMAIL diisi)
 * ════════════════════════════════════════════════════
 */

/* ── Konfigurasi — WAJIB diubah sebelum deploy ── */
const SHEET_ID    = 'YOUR_GOOGLE_SHEET_ID';  // ← ganti dengan ID spreadsheet kamu
const SHEET_NAME  = 'Leads';                  // nama tab sheet
const NOTIFY_EMAIL = '';                       // email untuk notifikasi (opsional, kosongkan jika tidak perlu)

/* ── Kolom header ── */
const HEADERS = ['No', 'Timestamp', 'Nama Lengkap', 'Instagram', 'Sumber', 'Status'];

/**
 * doPost — menerima data dari landing page form
 * Dipanggil otomatis saat form di-submit (POST request)
 */
function doPost(e) {
  try {
    /* Parse JSON body */
    const raw  = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    /* Buka spreadsheet & sheet */
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    let   sheet = ss.getSheetByName(SHEET_NAME);

    /* Buat sheet + header jika belum ada */
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      formatHeader(sheet);
    }

    /* Hitung nomor urut */
    const lastRow = sheet.getLastRow();
    const rowNum  = lastRow < 1 ? 1 : lastRow; // header = row 1, data mulai row 2

    /* Tambah baris data */
    const newRow = [
      rowNum,                                      // No
      formatTimestamp(data.timestamp),             // Timestamp
      sanitize(data.name       ?? ''),             // Nama Lengkap
      '@' + sanitize(data.instagram ?? ''),        // Instagram
      sanitize(data.source     ?? 'Landing Page'), // Sumber
      'Baru',                                      // Status
    ];
    sheet.appendRow(newRow);

    /* Auto-resize kolom */
    sheet.autoResizeColumns(1, HEADERS.length);

    /* Kirim notifikasi email (opsional) */
    if (NOTIFY_EMAIL && NOTIFY_EMAIL.length > 0) {
      sendEmailNotification(data, rowNum);
    }

    return jsonResponse({ status: 'success', row: sheet.getLastRow() });

  } catch (err) {
    console.error('doPost error:', err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

/**
 * doGet — endpoint health check (test via browser)
 * Buka URL deployment di browser → harus tampil pesan sukses
 */
function doGet(e) {
  const action = e?.parameter?.action ?? '';

  if (action === 'count') {
    /* ?action=count → kembalikan jumlah leads */
    try {
      const ss    = SpreadsheetApp.openById(SHEET_ID);
      const sheet = ss.getSheetByName(SHEET_NAME);
      const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
      return jsonResponse({ status: 'ok', leads: count });
    } catch (err) {
      return jsonResponse({ status: 'error', message: err.message });
    }
  }

  return ContentService
    .createTextOutput('✅ Rantanginn Sheets endpoint aktif. Gunakan POST untuk submit lead.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ════════════════════════════════════════════════════ */

/** Format header row — bold + freeze + warna */
function formatHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#2A3C22');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/** Format ISO timestamp ke format lokal Indonesia */
function formatTimestamp(isoString) {
  try {
    const d = new Date(isoString ?? Date.now());
    return Utilities.formatDate(d, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
  } catch (_) {
    return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
  }
}

/** Strip karakter berbahaya dari input */
function sanitize(str) {
  return String(str).replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

/** Kirim notifikasi email ke NOTIFY_EMAIL */
function sendEmailNotification(data, rowNum) {
  const subject = `🍱 Lead Baru Rantanginn #${rowNum} — ${sanitize(data.name ?? 'Unknown')}`;
  const body    = `
Lead baru masuk ke Rantanginn Early Access!\n
No       : ${rowNum}
Nama     : ${sanitize(data.name ?? '-')}
Instagram: @${sanitize(data.instagram ?? '-')}
Waktu    : ${formatTimestamp(data.timestamp)}
Sumber   : ${sanitize(data.source ?? 'Landing Page')}

Lihat semua leads di Google Sheet.
  `.trim();

  MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
}

/** Helper: return JSON ContentService response */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

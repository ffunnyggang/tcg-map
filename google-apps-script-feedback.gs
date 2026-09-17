const SPREADSHEET_ID = '1u_lyRE8vYNA0hvjM0tBO39ojgttipBQepzZRKEUhVd8';
const SHEET_NAME = '서비스 개선 의견';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const rating = String(data.rating || '').trim();
    const inconvenience = String(data.inconvenience || '').trim().slice(0, 2000);
    const improvement = String(data.improvement || '').trim().slice(0, 2000);

    if (!/^[1-5]$/.test(rating)) {
      return output_({ ok: false, error: 'invalid_rating' });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found');

    sheet.appendRow([new Date(), Number(rating), inconvenience, improvement, '확인 전']);
    return output_({ ok: true });
  } catch (err) {
    return output_({ ok: false, error: String(err && err.message || err) });
  }
}

function output_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

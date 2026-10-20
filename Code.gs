/* ARGOPOWER Tool Blaster: scoreboard backend (Google Apps Script)
   SETUP
   1) Go to sheets.new and name the sheet "ARGOPOWER Scores".
   2) Extensions > Apps Script. Paste this whole file, then Save.
   3) Deploy > New deployment > type Web app. Execute as: Me. Who has access: Anyone. Deploy and authorize.
   4) Copy the Web app URL (ends in /exec) and paste it into API_URL in index.html.
   5) After any later change here: Deploy > Manage deployments > Edit > Version: New version > Deploy.
   Scores are stored in the "scores" tab (one row per player, best score kept). */
const ENDS = '';                 // optional campaign end, e.g. '2026-12-31T23:59:59+08:00'
const MAX_PTS_PER_SEC = 150;     // anything faster than this is rejected as a fake
const MIN_GAP_SEC = 15;          // minimum seconds between submissions from one device
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName('scores');
  if (!s) { s = ss.insertSheet('scores'); s.appendRow(['updated', 'did', 'name', 'best', 'plays']); }
  return s;
}
function json_(o) { return ContentService.createTextOutput(typeof o === 'string' ? o : JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() {
  const c = CacheService.getScriptCache();
  let t = c.get('top');
  if (!t) {
    const rows = sheet_().getDataRange().getValues().slice(1).map(r => ({ n: r[2], s: +r[3] })).sort((a, b) => b.s - a.s).slice(0, 10);
    t = JSON.stringify({ ok: true, rows }); c.put('top', t, 20);
  }
  return json_(t);
}
function doPost(e) {
  const L = LockService.getScriptLock();
  try { L.waitLock(10000); } catch (x) { return json_({ ok: false, err: 'Busy, try again' }); }
  try {
    const p = JSON.parse(e.postData.contents), c = CacheService.getScriptCache();
    if (ENDS && Date.now() > new Date(ENDS).getTime()) return json_({ ok: false, err: 'The campaign has ended' });
    const name = String(p.name || '').replace(/[^\p{L}\p{N} .\-_]/gu, '').trim().slice(0, 12);
    const did = String(p.did || '').replace(/\W/g, '').slice(0, 20);
    const score = Math.floor(+p.score), secs = Math.floor(+p.secs);
    if (name.length < 2 || !did || !(score >= 0) || !(secs >= 3)) return json_({ ok: false, err: 'Invalid entry' });
    if (score > MAX_PTS_PER_SEC * secs + 100) return json_({ ok: false, err: 'Score rejected' });
    if (c.get('g' + did)) return json_({ ok: false, err: 'Please wait a few seconds' });
    c.put('g' + did, '1', MIN_GAP_SEC);
    const s = sheet_(), v = s.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < v.length; i++) if (v[i][1] === did) { row = i + 1; break; }
    let best = score;
    if (row < 0) s.appendRow([new Date(), did, name, score, 1]);
    else { best = Math.max(+v[row - 1][3], score); s.getRange(row, 1, 1, 5).setValues([[new Date(), did, name, best, +v[row - 1][4] + 1]]); }
    c.remove('top');
    const rank = 1 + s.getDataRange().getValues().slice(1).filter(r => r[1] !== did && +r[3] > best).length;
    return json_({ ok: true, rank });
  } catch (x) { return json_({ ok: false, err: 'Server error' }); }
  finally { L.releaseLock(); }
}

// ============================================================
// AUDIT-NOCODB.JS — Tổng kiểm tra NocoDB + Code (CHỈ ĐỌC)
// Dự án: QLBH_NTTT — Nội Thất Tính Tuyết
// Cách chạy:  đặt file này ở thư mục gốc dự án (qlbh-nttt)
//             node audit-nocodb.js
// Kết quả:   in ra màn hình + ghi file audit-report.txt
// Script này KHÔNG ghi/sửa/xóa bất cứ thứ gì trên NocoDB.
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = [];
function log(s = '') { console.log(s); REPORT.push(s); }
function ok(s)   { log('  ✅ OK   - ' + s); }
function fail(s) { log('  ❌ FAIL - ' + s); }
function warn(s) { log('  ⚠️  CHÚ Ý - ' + s); }

// ---------- BƯỚC 0: Đọc .env.local ----------
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

// Bỏ dấu tiếng Việt để so "gần giống" (bắt lỗi kiểu Huỷ/Hủy)
function strip(s) {
  return s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
const hasVNChar = (s) => /[À-ỹĐđ]/.test(s);

async function api(url, token) {
  const res = await fetch(url, { headers: { 'xc-token': token } });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
  return res.json();
}

// ---------- CHECKLIST PHƯƠNG ÁN B ----------
// Tên bảng so theo dạng bỏ dấu + chứa từ khóa, để không lệ thuộc đúng 100% tên
const PLAN_B = [
  { match: '5_', cols: ['Hình thức cọc', 'Hình thức hoàn trả', 'Ngày hủy'] },
  { match: '9_', cols: ['Hình thức thu', 'Hình thức chi'] },
  { match: '12_', cols: ['Hình thức'] },
  { match: '13_', cols: ['Hình thức'] },
  { match: '14_', cols: ['Loại', 'Hình thức'] },
];

async function main() {
  log('================================================================');
  log(' TỔNG KIỂM TRA NOCODB + CODE — ' + new Date().toLocaleString('vi-VN'));
  log('================================================================\n');

  // ---------- BƯỚC 1: Kết nối ----------
  log('BƯỚC 1: Đọc cấu hình & kết nối NocoDB');
  const env = loadEnv();
  const URL_ = (env.NOCODB_URL || '').replace(/\/$/, '');
  const TOKEN = env.NOCODB_TOKEN || '';
  const BASE_ID = env.NOCODB_BASE_ID || 'pqfe6a6c7yfc0dr';
  if (!URL_ || !TOKEN) { fail('Thiếu NOCODB_URL hoặc NOCODB_TOKEN trong .env.local'); return finish(); }
  ok(`NOCODB_URL = ${URL_}`);

  // Lấy danh sách bảng: thử v1 trước (theo tài liệu dự án), fallback v2
  let tables = null;
  try {
    const d = await api(`${URL_}/api/v1/db/meta/projects/${BASE_ID}/tables`, TOKEN);
    tables = d.list || d;
    ok(`Lấy danh sách bảng qua API v1 — ${tables.length} bảng`);
  } catch (e1) {
    try {
      const d = await api(`${URL_}/api/v2/meta/bases/${BASE_ID}/tables`, TOKEN);
      tables = d.list || d;
      ok(`Lấy danh sách bảng qua API v2 — ${tables.length} bảng`);
    } catch (e2) {
      fail('Không lấy được danh sách bảng: ' + e1.message + ' | ' + e2.message);
      return finish();
    }
  }

  // ---------- BƯỚC 2: Quét từng bảng ----------
  log('\nBƯỚC 2: Quét cột + tỷ lệ có dữ liệu từng bảng (mẫu tối đa 200 dòng)');
  const allColumns = [];      // { table, col, fillPct, type }
  const allSelectOptions = []; // { table, col, option }

  for (const t of tables) {
    const tName = t.title || t.table_name;
    log(`\n──── BẢNG: ${tName} ────`);

    // 2a. Lấy meta cột
    let cols = [];
    try {
      let meta;
      try { meta = await api(`${URL_}/api/v1/db/meta/tables/${t.id}`, TOKEN); }
      catch { meta = await api(`${URL_}/api/v2/meta/tables/${t.id}`, TOKEN); }
      cols = (meta.columns || []).filter(c => !c.system);
      ok(`Đọc meta: ${cols.length} cột`);
    } catch (e) { fail('Không đọc được meta cột: ' + e.message); continue; }

    // 2b. Lấy dữ liệu mẫu
    let rows = [];
    try {
      const d = await api(`${URL_}/api/v2/tables/${t.id}/records?limit=200`, TOKEN);
      rows = d.list || [];
      ok(`Đọc dữ liệu mẫu: ${rows.length} dòng`);
    } catch (e) { warn('Không đọc được dữ liệu (bỏ qua tỷ lệ): ' + e.message); }

    // 2c. Tỷ lệ có dữ liệu từng cột
    for (const c of cols) {
      const name = c.title;
      let filled = 0;
      for (const r of rows) {
        const v = r[name];
        if (v !== null && v !== undefined && String(v).trim() !== '') filled++;
      }
      const pct = rows.length ? Math.round((filled / rows.length) * 100) : -1;
      allColumns.push({ table: tName, col: name, fillPct: pct, type: c.uidt });

      let flag = '';
      if (pct === 0 && rows.length > 0) flag = '   👈 CỘT TRỐNG 100% — nghi ghi sai tên hoặc cột thừa';
      log(`    ${String(pct >= 0 ? pct + '%' : 'n/a').padStart(4)}  [${(c.uidt || '').padEnd(14)}] ${name}${flag}`);

      // 2d. Option của Single/Multi Select
      const opts = c.colOptions && c.colOptions.options;
      if (opts && opts.length) {
        const titles = opts.map(o => o.title);
        log(`           ↳ options: ${titles.join(' | ')}`);
        for (const o of titles) allSelectOptions.push({ table: tName, col: name, option: o });
      }
    }
  }

  // ---------- BƯỚC 3: Checklist Phương án B ----------
  log('\nBƯỚC 3: Đối chiếu checklist Sổ quỹ (Phương án B)');
  for (const rule of PLAN_B) {
    const tbl = tables.map(t => t.title || t.table_name).find(n => n.startsWith(rule.match));
    if (!tbl) { warn(`Không tìm thấy bảng bắt đầu bằng "${rule.match}"`); continue; }
    const colsOfTable = allColumns.filter(c => c.table === tbl).map(c => c.col);
    for (const need of rule.cols) {
      const found = colsOfTable.find(c => strip(c) === strip(need));
      if (found) {
        const info = allColumns.find(c => c.table === tbl && c.col === found);
        if (info.fillPct === 0) warn(`${tbl} → có cột "${found}" nhưng TRỐNG 100% dữ liệu`);
        else ok(`${tbl} → có cột "${found}" (dữ liệu ${info.fillPct}%)`);
      } else {
        fail(`${tbl} → THIẾU cột "${need}"`);
      }
    }
  }
  const has18 = tables.some(t => strip(t.title || t.table_name).includes('quy dau ky'));
  if (has18) ok('Đã có bảng Quỹ đầu kỳ');
  else fail('CHƯA có bảng "18_Quỹ đầu kỳ" (số dư đầu kỳ Tiền mặt / Ngân hàng)');

  // ---------- BƯỚC 4: Quét code tìm tên field ----------
  log('\nBƯỚC 4: Quét code (app/, components/, lib/) đối chiếu tên field');
  const codeStrings = new Map(); // string -> [file:line]
  const scanDirs = ['app', 'components', 'lib'].map(d => path.join(ROOT, d)).filter(fs.existsSync);
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) { if (f !== 'node_modules' && f !== '.next') walk(p); }
      else if (/\.(ts|tsx|js|jsx)$/.test(f)) {
        const lines = fs.readFileSync(p, 'utf8').split('\n');
        lines.forEach((line, i) => {
          for (const m of line.matchAll(/['"]([^'"\\]{2,60})['"]/g)) {
            const s = m[1];
            if (hasVNChar(s)) {
              if (!codeStrings.has(s)) codeStrings.set(s, []);
              const loc = path.relative(ROOT, p) + ':' + (i + 1);
              if (codeStrings.get(s).length < 5) codeStrings.get(s).push(loc);
            }
          }
        });
      }
    }
  }
  scanDirs.forEach(walk);
  ok(`Tìm thấy ${codeStrings.size} chuỗi tiếng Việt trong code`);

  // Tập hợp mọi "tên hợp lệ" phía NocoDB: tên cột + option select + tên bảng
  const validNames = new Set();
  allColumns.forEach(c => validNames.add(c.col));
  allSelectOptions.forEach(o => validNames.add(o.option));
  tables.forEach(t => validNames.add(t.title || t.table_name));
  const validByStrip = new Map();
  for (const v of validNames) {
    if (!validByStrip.has(strip(v))) validByStrip.set(strip(v), []);
    validByStrip.get(strip(v)).push(v);
  }

  // 4a. Chuỗi trong code KHÔNG khớp chính xác tên nào trên NocoDB
  log('\n  --- Chuỗi trong code KHÔNG khớp chính xác với NocoDB ---');
  let mismatchCount = 0;
  for (const [s, locs] of codeStrings) {
    if (validNames.has(s)) continue;
    const near = validByStrip.get(strip(s));
    if (near && near.length) {
      // Gần giống sau khi bỏ dấu → khả năng cao là lỗi Unicode/dấu (kiểu Huỷ/Hủy)
      mismatchCount++;
      fail(`Code dùng "${s}" — NocoDB lại là "${near.join('" / "')}"`);
      log(`         tại: ${locs.join(' ; ')}`);
    }
  }
  if (mismatchCount === 0) ok('Không phát hiện lỗi lệch dấu/Unicode giữa code và NocoDB');

  // 4b. Cột NocoDB không hề xuất hiện trong code → ứng viên cột thừa
  log('\n  --- Cột tồn tại trên NocoDB nhưng KHÔNG xuất hiện trong code ---');
  const codeStrip = new Set([...codeStrings.keys()].map(strip));
  let unusedCount = 0;
  for (const c of allColumns) {
    if (['ID', 'Id', 'CreatedAt', 'UpdatedAt'].includes(c.col)) continue;
    if (!codeStrip.has(strip(c.col))) {
      unusedCount++;
      const note = c.fillPct === 0 ? ' (và TRỐNG 100% → ứng viên ẩn/xóa)' : ` (dữ liệu ${c.fillPct}%)`;
      warn(`${c.table} → cột "${c.col}" không thấy trong code${note}`);
    }
  }
  if (unusedCount === 0) ok('Mọi cột đều được code sử dụng');

  log('\n================================================================');
  log(' KẾT THÚC. Hãy gửi file audit-report.txt cho Claude để phân tích.');
  log('================================================================');
  finish();
}

function finish() {
  fs.writeFileSync(path.join(ROOT, 'audit-report.txt'), REPORT.join('\n'), 'utf8');
  console.log('\n📄 Đã ghi báo cáo: audit-report.txt');
}

main().catch(e => { fail('Lỗi không mong muốn: ' + e.message); finish(); });

// lib/nocodb.ts - PHIÊN BẢN CẬP NHẬT
// Thêm DOI_SOAT vào TABLES

const NOCODB_URL   = process.env.NOCODB_URL   || ''
const NOCODB_TOKEN = process.env.NOCODB_TOKEN || ''
const BASE_ID      = process.env.NOCODB_BASE_ID || ''
const API_BASE     = `${NOCODB_URL}/api/v1`

const headers = {
  'xc-auth':      NOCODB_TOKEN,
  'xc-token':     NOCODB_TOKEN,
  'Content-Type': 'application/json',
}

export const TABLES = {
  KHACH_HANG:     '1_Khách hàng',
  SAN_PHAM:       '2_Sản phẩm',
  NHAN_VIEN:      '3_Nhân viên',
  NHA_CUNG_CAP:   '4_Nhà cung cấp',
  DON_HANG:       '5_Đơn hàng',
  CHI_TIET_DON:   '6_Chi tiết đơn hàng',
  GIAO_HANG:      '7_Giao hàng',
  CHI_TIET_GIAO:  '8_Chi tiết giao hàng',
  DOI_SOAT:       '9_Đối soát giao hàng',
  DAT_HANG_NCC:   '10_Đặt hàng NCC',
  NHAP_KHO:       '11_Nhập kho',
  XU_LY_HANG:     '18_Xử lý hàng lỗi',
  THANH_TOAN_NCC: '12_Lịch sử thanh toán NCC',
  CHI_TRA_NV:     '13_Chi trả nhân viên',
  CHI_PHI:        '14_Thu chi hoạt động',
  BAO_CAO:        '15_Báo cáo tháng',
  TAI_KHOAN:      '16_Tài khoản',
  KIEM_KHO:       '17_Kiểm kho',
  DOT_KIEM_KHO:   '17_Đợt kiểm kho',
  CT_KIEM_KHO:    '17b_Chi tiết kiểm kho',
  CHAM_CONG:      '3b_Chấm công',
  TAM_UNG_NV:     '13b_Tạm ứng NV',
  THUONG_KHAC:    '13c_Thưởng khác',
  DANH_MUC:       'CaiDat_DanhMuc',
  CAI_DAT:        'CaiDat',
  NHAT_KY:        '18_Nhật ký thao tác',
}

let tableCache: Record<string, string> = {}

export async function getTableId(tableName: string): Promise<string> {
  if (tableCache[tableName]) return tableCache[tableName]
  const url = `${API_BASE}/db/meta/projects/${BASE_ID}/tables`
  const res = await fetch(url, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error(`Lấy danh sách bảng thất bại: HTTP ${res.status}`)
  const data = await res.json()
  const list = data.list || []
  list.forEach((t: any) => { if (t.id && t.title) tableCache[t.title] = t.id })
  if (tableCache[tableName]) return tableCache[tableName]
  const names = list.map((t: any) => t.title).join(', ')
  throw new Error(`Không tìm thấy bảng "${tableName}". Có: ${names}`)
}

export async function getRecords(
  tableName: string,
  options: { where?: string; limit?: number; offset?: number; sort?: string; fields?: string } = {}
) {
  try {
    const tableId = await getTableId(tableName)
    const params  = new URLSearchParams()
    if (options.where)  params.set('where',  options.where)
    if (options.limit)  params.set('limit',  String(options.limit))
    if (options.offset) params.set('offset', String(options.offset))
    if (options.sort)   params.set('sort',   options.sort)
    if (options.fields) params.set('fields', options.fields)
    const url = `${API_BASE}/db/data/noco/${BASE_ID}/${tableId}?${params}`
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) { console.error('getRecords failed:', tableName, res.status, await res.text()); return { list: [], pageInfo: { totalRows: 0 } } }
    return await res.json()
  } catch (err) {
    console.error(`getRecords "${tableName}":`, err)
    return { list: [], pageInfo: { totalRows: 0 } }
  }
}

export async function getRecord(tableName: string, rowId: number) {
  try {
    const tableId = await getTableId(tableName)
    const res = await fetch(
      `${API_BASE}/db/data/noco/${BASE_ID}/${tableId}/${rowId}`,
      { headers, cache: 'no-store' }
    )
    if(!res.ok){const e=await res.json();console.error('NocoDB POST error:',tableName,JSON.stringify(e));return null};return await res.json()
  } catch { return null }
}

export async function findRecord(tableName: string, field: string, value: string) {
  const r = await getRecords(tableName, { where: `(${field},eq,${value})`, limit: 1 })
  return r.list?.[0] || null
}

export async function createRecord(tableName: string, body: Record<string, any>) {
  try {
    const tableId = await getTableId(tableName)
    const res = await fetch(
      `${API_BASE}/db/data/noco/${BASE_ID}/${tableId}`,
      { method: 'POST', headers, body: JSON.stringify(body) }
    )
    if(!res.ok){const e=await res.json();console.error('NocoDB POST error:',tableName,JSON.stringify(e));return null};return await res.json()
  } catch { return null }
}

export async function updateRecord(tableName: string, rowId: number, body: Record<string, any>) {
  try {
    const tableId = await getTableId(tableName)
    const res = await fetch(
      `${API_BASE}/db/data/noco/${BASE_ID}/${tableId}/${rowId}`,
      { method: 'PATCH', headers, body: JSON.stringify(body) }
    )
    if(!res.ok){const e=await res.json();console.error('NocoDB POST error:',tableName,JSON.stringify(e));return null};return await res.json()
  } catch { return null }
}

export async function deleteRecord(tableName: string, rowId: number) {
  try {
    const tableId = await getTableId(tableName)
    const res = await fetch(
      `${API_BASE}/db/data/noco/${BASE_ID}/${tableId}/${rowId}`,
      { method: 'DELETE', headers }
    )
    return res.ok
  } catch { return false }
}

// ── WRITE LOG ──────────────────────────────────────────────────────────────
export interface LogParams {
  maNV:      string
  tenNV:     string
  hanhDong:  string   // 'Tạo' | 'Sửa' | 'Xóa' | 'Hủy' | 'Duyệt' | 'Nộp tiền' | ...
  bang:      string   // Tên bảng bị tác động
  maBanGhi:  string   // Mã đơn, mã CP, ...
  moTa:      string   // Diễn giải ngắn gọn
  duLieuCu?: any      // Object trước khi sửa
  duLieuMoi?: any     // Object sau khi sửa
}
export async function writeLog(params: LogParams): Promise<void> {
  try {
    const now = new Date()
    const pad = (n:number) => String(n).padStart(2,'0')
    const maLog = 'LOG-' + now.getFullYear().toString().slice(2)
      + pad(now.getMonth()+1) + pad(now.getDate())
      + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds())
      + '-' + Math.floor(Math.random()*9000+1000)
    await createRecord(TABLES.NHAT_KY, {
      'Mã log':       maLog,
      'Thời gian':    now.toISOString(),
      'Mã NV':        params.maNV,
      'Tên NV':       params.tenNV,
      'Hành động':    params.hanhDong,
      'Bảng':         params.bang,
      'Mã bản ghi':   params.maBanGhi,
      'Mô tả':        params.moTa,
      'Dữ liệu cũ':   params.duLieuCu  ? JSON.stringify(params.duLieuCu)  : '',
      'Dữ liệu mới':  params.duLieuMoi ? JSON.stringify(params.duLieuMoi) : '',
    })
  } catch(e) {
    console.error('[writeLog] Lỗi ghi log:', e)
    // Không throw — lỗi log không được ảnh hưởng response
  }
}



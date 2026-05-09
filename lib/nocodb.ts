// lib/nocodb.ts - Kết nối NocoDB API (tương thích phiên bản 2026.x)
// ============================================================
// Khi dùng cho dự án khác: chỉ sửa file .env.local
// KHÔNG cần sửa file này.
//
// Thay đổi so với phiên bản cũ:
//   /db/meta/projects/ → /db/meta/bases/   (NocoDB 2026.x)
// ============================================================

const NOCODB_URL     = process.env.NOCODB_URL     || ''
const NOCODB_SUBPATH = process.env.NOCODB_SUBPATH || ''
const NOCODB_TOKEN   = process.env.NOCODB_TOKEN   || ''
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || ''

// URL gốc API — kết hợp URL + subpath
// VD: https://nocodb-xxx.railway.app/dashboard/api/v1
const API_BASE = `${NOCODB_URL}${NOCODB_SUBPATH}/api/v1`

const headers = {
  'xc-auth': NOCODB_TOKEN,
  'Content-Type': 'application/json',
}

// ── Tên bảng trong NocoDB ────────────────────────────────────
// Sửa đây nếu đổi tên bảng trong NocoDB
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
  THANH_TOAN_NCC: '12_Thanh toán NCC',
  CHI_TRA_NV:     '13_Chi trả nhân viên',
  CHI_PHI:        '14_Chi phí hoạt động',
  BAO_CAO:        '15_Báo cáo tháng',
  TAI_KHOAN:      '16_Tài khoản',
  KIEM_KHO:       '17_Kiểm kho',
}

// ── Cache table ID ───────────────────────────────────────────
let tableIdCache: Record<string, string> = {}

export async function getTableId(tableName: string): Promise<string> {
  if (tableIdCache[tableName]) return tableIdCache[tableName]

  // NocoDB 2026.x dùng /bases/ thay vì /projects/
  const url = `${API_BASE}/db/meta/bases/${NOCODB_BASE_ID}/tables`
  try {
    const res  = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`)
    }
    const data = await res.json()
    const list = data.list || []

    const table = list.find((t: any) => t.title === tableName)
    if (table) {
      tableIdCache[tableName] = table.id
      return table.id
    }

    const available = list.map((t: any) => t.title).join(', ')
    throw new Error(`Không tìm thấy bảng "${tableName}". Có: ${available}`)
  } catch (error) {
    console.error('getTableId error:', error)
    throw error
  }
}

// ── Lấy danh sách records ────────────────────────────────────
export async function getRecords(
  tableName: string,
  options: {
    where?:  string
    limit?:  number
    offset?: number
    sort?:   string
    fields?: string
  } = {}
) {
  try {
    const tableId = await getTableId(tableName)
    const params  = new URLSearchParams()
    if (options.where)  params.set('where',  options.where)
    if (options.limit)  params.set('limit',  String(options.limit))
    if (options.offset) params.set('offset', String(options.offset))
    if (options.sort)   params.set('sort',   options.sort)
    if (options.fields) params.set('fields', options.fields)

    const url = `${API_BASE}/db/data/noco/${NOCODB_BASE_ID}/${tableId}?${params}`
    const res = await fetch(url, { headers, cache: 'no-store' })

    if (!res.ok) {
      console.error(`getRecords "${tableName}" HTTP ${res.status}`)
      return { list: [], pageInfo: { totalRows: 0 } }
    }
    return await res.json()
  } catch (error) {
    console.error(`getRecords "${tableName}":`, error)
    return { list: [], pageInfo: { totalRows: 0 } }
  }
}

// ── Lấy 1 record theo Row ID ─────────────────────────────────
export async function getRecord(tableName: string, rowId: number) {
  try {
    const tableId = await getTableId(tableName)
    const url = `${API_BASE}/db/data/noco/${NOCODB_BASE_ID}/${tableId}/${rowId}`
    const res = await fetch(url, { headers, cache: 'no-store' })
    return res.ok ? await res.json() : null
  } catch (error) {
    console.error(`getRecord "${tableName}" id=${rowId}:`, error)
    return null
  }
}

// ── Tìm 1 record theo điều kiện ──────────────────────────────
export async function findRecord(tableName: string, field: string, value: string) {
  const result = await getRecords(tableName, {
    where: `(${field},eq,${value})`,
    limit: 1,
  })
  return result.list?.[0] || null
}

// ── Tạo record mới ──────────────────────────────────────────
export async function createRecord(tableName: string, body: Record<string, any>) {
  try {
    const tableId = await getTableId(tableName)
    const url = `${API_BASE}/db/data/noco/${NOCODB_BASE_ID}/${tableId}`
    const res = await fetch(url, {
      method: 'POST', headers, body: JSON.stringify(body),
    })
    return res.ok ? await res.json() : null
  } catch (error) {
    console.error(`createRecord "${tableName}":`, error)
    return null
  }
}

// ── Cập nhật record ──────────────────────────────────────────
export async function updateRecord(
  tableName: string, rowId: number, body: Record<string, any>
) {
  try {
    const tableId = await getTableId(tableName)
    const url = `${API_BASE}/db/data/noco/${NOCODB_BASE_ID}/${tableId}/${rowId}`
    const res = await fetch(url, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    })
    return res.ok ? await res.json() : null
  } catch (error) {
    console.error(`updateRecord "${tableName}" id=${rowId}:`, error)
    return null
  }
}

// ── Xoá record ──────────────────────────────────────────────
export async function deleteRecord(tableName: string, rowId: number) {
  try {
    const tableId = await getTableId(tableName)
    const url = `${API_BASE}/db/data/noco/${NOCODB_BASE_ID}/${tableId}/${rowId}`
    const res = await fetch(url, { method: 'DELETE', headers })
    return res.ok
  } catch (error) {
    console.error(`deleteRecord "${tableName}" id=${rowId}:`, error)
    return false
  }
}

// ── Kiểm tra kết nối ─────────────────────────────────────────
export async function checkConnection() {
  try {
    const url = `${API_BASE}/db/meta/bases/${NOCODB_BASE_ID}/tables`
    const res = await fetch(url, { headers })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, tables: data.list?.map((t: any) => t.title) || [] }
    }
    return { ok: false, error: `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

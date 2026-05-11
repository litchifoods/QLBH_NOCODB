// lib/nocodb.ts - PHIÊN BẢN HOẠT ĐỘNG
// Endpoint đúng: /api/v1/db/meta/projects/ (NocoDB 2026.x trên Railway)

const NOCODB_URL   = process.env.NOCODB_URL   || ''
const NOCODB_TOKEN = process.env.NOCODB_TOKEN || ''
const BASE_ID      = process.env.NOCODB_BASE_ID || ''
const API_BASE     = `${NOCODB_URL}/api/v1`

const headers = {
  'xc-auth':      NOCODB_TOKEN,
  'xc-token':     NOCODB_TOKEN,
  'Content-Type': 'application/json',
}

// Tên bảng trong NocoDB
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

// Cache table ID
let tableCache: Record<string, string> = {}

export async function getTableId(tableName: string): Promise<string> {
  if (tableCache[tableName]) return tableCache[tableName]

  // Endpoint đúng cho NocoDB 2026.x
  const url = `${API_BASE}/db/meta/projects/${BASE_ID}/tables`
  const res = await fetch(url, { headers, cache: 'no-store' })

  if (!res.ok) throw new Error(`Lấy danh sách bảng thất bại: HTTP ${res.status}`)

  const data = await res.json()
  const list = data.list || []

  list.forEach((t: any) => {
    if (t.id && t.title) tableCache[t.title] = t.id
  })

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
    if (!res.ok) return { list: [], pageInfo: { totalRows: 0 } }
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
    return res.ok ? await res.json() : null
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
    return res.ok ? await res.json() : null
  } catch { return null }
}

export async function updateRecord(tableName: string, rowId: number, body: Record<string, any>) {
  try {
    const tableId = await getTableId(tableName)
    const res = await fetch(
      `${API_BASE}/db/data/noco/${BASE_ID}/${tableId}/${rowId}`,
      { method: 'PATCH', headers, body: JSON.stringify(body) }
    )
    return res.ok ? await res.json() : null
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

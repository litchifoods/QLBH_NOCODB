// app/api/meta/route.ts
// Đọc Single Select options từ NocoDB metadata
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const NOCODB_URL   = process.env.NOCODB_URL   || ''
const NOCODB_TOKEN = process.env.NOCODB_TOKEN || ''
const BASE_ID      = process.env.NOCODB_BASE_ID || ''
const API_BASE     = `${NOCODB_URL}/api/v1`
const headers = { 'xc-auth': NOCODB_TOKEN, 'xc-token': NOCODB_TOKEN }

// Cache đơn giản trong memory (reset khi restart server)
let cache: Record<string, string[]> = {}
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 phút

async function getTableId(tableName: string): Promise<string> {
  const res = await fetch(`${API_BASE}/db/meta/projects/${BASE_ID}/tables`, { headers })
  const data = await res.json()
  const table = (data.list || []).find((t: any) => t.title === tableName)
  if (!table) throw new Error(`Không tìm thấy bảng: ${tableName}`)
  return table.id
}

async function getSelectOptions(tableName: string, fieldName: string): Promise<string[]> {
  const key = `${tableName}::${fieldName}`
  const now = Date.now()
  if (cache[key] && now - cacheTime < CACHE_TTL) return cache[key]

  try {
    const tableId = await getTableId(tableName)
    const res = await fetch(`${API_BASE}/db/meta/projects/${BASE_ID}/tables/${tableId}/fields`, { headers })
    const data = await res.json()
    const field = (data.list || []).find((f: any) => f.title === fieldName)
    if (!field) return []
    const options = (field.colOptions?.options || [])
      .filter((o: any) => o.title)
      .map((o: any) => o.title as string)
    cache[key] = options
    cacheTime = now
    return options
  } catch (e) {
    console.error('getSelectOptions error:', e)
    return []
  }
}

// Các cột cần đọc: { key: [tableName, fieldName] }
const FIELDS_CONFIG: Record<string, [string, string]> = {
  'don-vi-tinh':       ['2_Sản phẩm',           'Đơn vị tính'],
  'loai-sp':           ['2_Sản phẩm',           'Loại SP'],
  'kenh-ban':          ['5_Đơn hàng',           'Kênh bán'],
  'hinh-thuc-giao':    ['5_Đơn hàng',           'Hình thức giao hàng'],
  'vai-tro-chuyen':    ['7_Giao hàng',          'Vai trò chuyến'],
  'hinh-thuc-giao-gh': ['7_Giao hàng',          'Hình thức giao'],
  'hinh-thuc-thu':     ['9_Đối soát giao hàng', 'Hình thức thu'],
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const keys = searchParams.get('keys')?.split(',') || Object.keys(FIELDS_CONFIG)

    const result: Record<string, string[]> = {}
    await Promise.all(keys.map(async (key) => {
      const cfg = FIELDS_CONFIG[key.trim()]
      if (cfg) result[key.trim()] = await getSelectOptions(cfg[0], cfg[1])
    }))

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=300' }
    })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

// Xóa cache khi cần
export async function DELETE() {
  cache = {}
  return NextResponse.json({ success: true })
}

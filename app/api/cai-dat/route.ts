// app/api/cai-dat/route.ts
// API lưu/đọc cài đặt hóa đơn từ NocoDB bảng CaiDat

import { NextRequest, NextResponse } from 'next/server'
import { getRecords, createRecord, updateRecord, TABLES } from '@/lib/nocodb'

export const dynamic = 'force-dynamic'

// Danh sách key hợp lệ (tránh ghi rác vào DB)
const VALID_KEYS = [
  'hoadon_tenCH',
  'hoadon_diaChiCH',
  'hoadon_sdtCH',
  'hoadon_gioiThieu',
  'hoadon_mangXH',
  'hoadon_chanTrang',
  'hoadon_logo',       // base64 logo
  'hoadon_logoSize',   // kích thước logo (số, đơn vị px)
]

// GET /api/cai-dat — đọc tất cả cài đặt, trả về object { key: value }
export async function GET() {
  try {
    const data = await getRecords('CaiDat', { limit: 100 })
    const result: Record<string, string> = {}
    for (const row of data.list || []) {
      if (row['key']) result[row['key']] = row['value'] || ''
    }
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    console.error('GET /api/cai-dat lỗi:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/cai-dat — lưu object { key: value, key2: value2, ... }
// Dùng upsert: nếu key đã có thì update, chưa có thì create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Đọc toàn bộ record hiện có để biết rowId
    const data = await getRecords('CaiDat', { limit: 100 })
    const existingMap: Record<string, { id: number; value: string }> = {}
    for (const row of data.list || []) {
      if (row['key']) existingMap[row['key']] = { id: row['Id'] || row['id'], value: row['value'] }
    }

    // Lưu từng key
    const errors: string[] = []
    for (const [k, v] of Object.entries(body)) {
      if (!VALID_KEYS.includes(k)) continue // bỏ qua key lạ
      const val = String(v ?? '')

      if (existingMap[k]) {
        // Update record đã có
        const ok = await updateRecord('CaiDat', existingMap[k].id, {
          key: k,
          value: val,
        })
        if (!ok) errors.push(`Không update được key: ${k}`)
      } else {
        // Tạo record mới
        const ok = await createRecord('CaiDat', {
          key: k,
          value: val,
          moTa: moTaMap[k] || k,
        })
        if (!ok) errors.push(`Không tạo được key: ${k}`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/cai-dat lỗi:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// Mô tả tiếng Việt cho từng key (lưu vào cột moTa)
const moTaMap: Record<string, string> = {
  hoadon_tenCH:      'Tên cửa hàng',
  hoadon_diaChiCH:   'Địa chỉ cửa hàng',
  hoadon_sdtCH:      'Số điện thoại',
  hoadon_gioiThieu:  'Giới thiệu ngắn',
  hoadon_mangXH:     'Mạng xã hội / website',
  hoadon_chanTrang:  'Chân trang hóa đơn',
  hoadon_logo:       'Logo cửa hàng (base64)',
  hoadon_logoSize:   'Kích thước logo (px)',
}

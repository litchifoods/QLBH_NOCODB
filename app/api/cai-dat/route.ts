// app/api/cai-dat/route.ts — v2.0
// Thêm 3 key căn chỉnh: hoadon_canThongTinCH, hoadon_canTieuDe, hoadon_canChanTrang

import { NextRequest, NextResponse } from 'next/server'
import { getRecords, createRecord, updateRecord } from '@/lib/nocodb'

export const dynamic = 'force-dynamic'

// Tất cả key hợp lệ
const VALID_KEYS = [
  'hoadon_tenCH',
  'hoadon_diaChiCH',
  'hoadon_sdtCH',
  'hoadon_gioiThieu',
  'hoadon_mangXH',
  'hoadon_chanTrang',
  'hoadon_logo',
  'hoadon_logoSize',
  'hoadon_canThongTinCH',  // căn thông tin cửa hàng
  'hoadon_canTieuDe',      // căn "HÓA ĐƠN BÁN HÀNG"
  'hoadon_canChanTrang',   // căn chân trang
]

// Mô tả tiếng Việt cho từng key
const MO_TA: Record<string, string> = {
  hoadon_tenCH:         'Tên cửa hàng',
  hoadon_diaChiCH:      'Địa chỉ cửa hàng',
  hoadon_sdtCH:         'Số điện thoại',
  hoadon_gioiThieu:     'Giới thiệu ngắn',
  hoadon_mangXH:        'Mạng xã hội / website',
  hoadon_chanTrang:     'Chân trang hóa đơn',
  hoadon_logo:          'Logo cửa hàng (base64)',
  hoadon_logoSize:      'Kích thước logo (px)',
  hoadon_canThongTinCH: 'Căn chỉnh thông tin cửa hàng',
  hoadon_canTieuDe:     'Căn chỉnh tiêu đề hóa đơn',
  hoadon_canChanTrang:  'Căn chỉnh chân trang',
}

// GET /api/cai-dat — đọc tất cả, trả về { key: value }
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

// POST /api/cai-dat — upsert từng key (tạo mới nếu chưa có, cập nhật nếu đã có)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Đọc toàn bộ record hiện có để biết rowId
    const data = await getRecords('CaiDat', { limit: 100 })
    const existingMap: Record<string, { id: number }> = {}
    for (const row of data.list || []) {
      if (row['key']) {
        existingMap[row['key']] = { id: row['Id'] || row['id'] }
      }
    }

    const errors: string[] = []

    for (const [k, v] of Object.entries(body)) {
      // Bỏ qua key không hợp lệ
      if (!VALID_KEYS.includes(k)) continue

      const val = String(v ?? '')

      if (existingMap[k]) {
        // Đã có → update
        const ok = await updateRecord('CaiDat', existingMap[k].id, {
          key:   k,
          value: val,
        })
        if (!ok) errors.push(`Không update được: ${k}`)
      } else {
        // Chưa có → tạo mới
        const ok = await createRecord('CaiDat', {
          key:   k,
          value: val,
          moTa:  MO_TA[k] || k,
        })
        if (!ok) errors.push(`Không tạo được: ${k}`)
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

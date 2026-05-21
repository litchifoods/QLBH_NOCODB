// app/api/cai-dat/route.ts — v5.0
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, createRecord, updateRecord } from '@/lib/nocodb'

export const dynamic = 'force-dynamic'

const VALID_KEYS = [
  'hoadon_tenCH', 'hoadon_coChuTenCH', 'hoadon_diaChiCH', 'hoadon_sdtCH',
  'hoadon_gioiThieu', 'hoadon_mangXH', 'hoadon_chanTrang',
  'hoadon_logo', 'hoadon_logoSize', 'hoadon_logoPart',
  'hoadon_canThongTinCH', 'hoadon_canTieuDe', 'hoadon_canChanTrang',
  'hoadon_mauChinh',   // ← MỚI: màu chủ đạo
]

const MO_TA: Record<string, string> = {
  hoadon_tenCH: 'Tên cửa hàng', hoadon_coChuTenCH: 'Cỡ chữ tên CH',
  hoadon_diaChiCH: 'Địa chỉ', hoadon_sdtCH: 'SĐT',
  hoadon_gioiThieu: 'Giới thiệu', hoadon_mangXH: 'Mạng xã hội',
  hoadon_chanTrang: 'Chân trang', hoadon_logo: 'Logo (base64)',
  hoadon_logoSize: 'Kích thước logo', hoadon_logoPart: 'Vị trí logo',
  hoadon_canThongTinCH: 'Căn thông tin CH', hoadon_canTieuDe: 'Căn tiêu đề',
  hoadon_canChanTrang: 'Căn chân trang', hoadon_mauChinh: 'Màu chủ đạo',
}

export async function GET() {
  try {
    const data = await getRecords('CaiDat', { limit: 100 })
    const result: Record<string, string> = {}
    for (const row of data.list || []) {
      if (row['key']) result[row['key']] = row['value'] || ''
    }
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await getRecords('CaiDat', { limit: 100 })
    const existingMap: Record<string, { id: number }> = {}
    for (const row of data.list || []) {
      if (row['key']) existingMap[row['key']] = { id: row['Id'] || row['id'] }
    }
    const errors: string[] = []
    for (const [k, v] of Object.entries(body)) {
      if (!VALID_KEYS.includes(k)) continue
      const val = String(v ?? '')
      if (existingMap[k]) {
        const ok = await updateRecord('CaiDat', existingMap[k].id, { key: k, value: val })
        if (!ok) errors.push(k)
      } else {
        const ok = await createRecord('CaiDat', { key: k, value: val, moTa: MO_TA[k] || k })
        if (!ok) errors.push(k)
      }
    }
    if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

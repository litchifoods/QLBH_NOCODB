// app/api/chi-tiet-don/route.ts — v2.0
// Thêm PATCH để cập nhật Trạng thái SP (hủy SP)

import { NextRequest, NextResponse } from 'next/server'
import { getRecords, createRecord, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const maDon = searchParams.get('maDon') || ''
    const where = maDon ? `(Mã đơn hàng,eq,${maDon})` : undefined

    const result = await getRecords(TABLES.CHI_TIET_DON, {
      where, limit: 100,
      fields: 'Id,Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Giá nhập,Thành tiền,Ghi chú SP,Trạng thái SP',
    })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const result = await createRecord(TABLES.CHI_TIET_DON, body)
    if (!result) return NextResponse.json({ message: 'Lỗi tạo chi tiết' }, { status: 500 })

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body          = await request.json()
    const { id, ...upd } = body
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    // Nếu hủy SP → cộng lại tồn kho
    if (upd['Trạng thái SP'] === 'Huỷ' && upd['Mã SP'] && Number(upd['Số lượng']||0) > 0) {
      const spR = await getRecords(TABLES.SAN_PHAM, { where: `(Mã SP,eq,)`, limit:1, fields:'Id,Tồn kho' })
      const sp = spR.list?.[0]
      if (sp) await updateRecord(TABLES.SAN_PHAM, Number(sp['Id']||sp['id']), { 'Tồn kho': Number(sp['Tồn kho']||0) + Number(upd['Số lượng']) })
    }
    const result = await updateRecord(TABLES.CHI_TIET_DON, Number(id), upd)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

// app/api/don-hang/route.ts — v3.0
// Sửa lỗi chính: NocoDB trả Mã đơn hàng = null ngay sau khi tạo
// Giải pháp: sau khi tạo, query lại bằng Id để lấy Mã đơn hàng thực tế

import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const result = await createRecord(TABLES.DON_HANG, body)
    if (!result) return NextResponse.json({ message: 'Lỗi tạo đơn hàng' }, { status: 500 })

    const rowId = result['Id'] || result['id']
    let maDon   = result['Mã đơn hàng'] || ''

    // ── NocoDB đôi khi trả Mã đơn hàng = null ngay sau khi INSERT ──
    // Đợi 800ms rồi query lại bằng rowId để lấy mã thực tế
    if (!maDon && rowId) {
      await new Promise(r => setTimeout(r, 800))
      const fresh = await getRecord(TABLES.DON_HANG, rowId)
      maDon = fresh?.['Mã đơn hàng'] || ''

      // Nếu vẫn null, thử thêm 1 lần nữa sau 1.2 giây
      if (!maDon) {
        await new Promise(r => setTimeout(r, 1200))
        const fresh2 = await getRecord(TABLES.DON_HANG, rowId)
        maDon = fresh2?.['Mã đơn hàng'] || ''
      }
    }

    // Fallback cuối cùng: tạo mã tạm dựa trên Id
    // (trường hợp NocoDB chưa có formula tự động)
    if (!maDon && rowId) {
      maDon = `DH-${String(rowId).padStart(3, '0')}`
    }

    return NextResponse.json({
      success: true,
      data:    result,
      maDon,   // ← field riêng để client đọc dễ
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const where  = searchParams.get('where')  || undefined
    const limit  = Number(searchParams.get('limit')  || 100)
    const offset = Number(searchParams.get('offset') || 0)
    const sort   = searchParams.get('sort')   || '-Ngày bán'

    const result = await getRecords(TABLES.DON_HANG, { where, limit, offset, sort })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    const result = await updateRecord(TABLES.DON_HANG, id, updateData)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

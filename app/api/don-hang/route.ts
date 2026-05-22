// app/api/don-hang/route.ts — v4.0
// Sửa lỗi 404: tự tạo Mã đơn hàng (format DH-YYYY-NNN) trước khi gửi lên NocoDB
// Vì cột "Mã đơn hàng" là Single Line Text — NocoDB không tự tạo

import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

// Hàm tạo mã đơn hàng tiếp theo: DH-YYYY-NNN
async function taoMaDonMoi(): Promise<string> {
  const nam = new Date().getFullYear()

  try {
    // Lấy đơn hàng gần nhất để tính số thứ tự
    const result = await getRecords(TABLES.DON_HANG, {
      limit: 1,
      sort: '-Id',
      fields: 'Mã đơn hàng,Id',
    })

    const donCuoi = result.list?.[0]
    if (donCuoi?.['Mã đơn hàng']) {
      const ma = donCuoi['Mã đơn hàng'] as string
      const parts = ma.split('-')
      const soHienTai = parseInt(parts[parts.length - 1] || '0')
      if (!isNaN(soHienTai)) {
        return `DH-${nam}-${String(soHienTai + 1).padStart(3, '0')}`
      }
    }

    return `DH-${nam}-001`

  } catch {
    const ts = Date.now().toString().slice(-4)
    return `DH-${nam}-${ts}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json()

    // Tạo mã đơn trước khi lưu
    const maDon = await taoMaDonMoi()

    const result = await createRecord(TABLES.DON_HANG, {
      ...body,
      'Mã đơn hàng': maDon,
    })

    if (!result) {
      return NextResponse.json({ message: 'Lỗi tạo đơn hàng' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data:    result,
      maDon:   result['Mã đơn hàng'] || maDon,
    })

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    }

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
    if (!session) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    if (!id) {
      return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })
    }

    const result = await updateRecord(TABLES.DON_HANG, id, updateData)
    return NextResponse.json({ success: true, data: result })

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

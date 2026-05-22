// app/api/khach-hang/route.ts — v2.0
// Sửa: tự tạo Mã KH trước khi lưu (vì cột là Single Line Text)

import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

// Tạo mã KH tiếp theo: KH-001, KH-002...
async function taoMaKHMoi(): Promise<string> {
  try {
    const result = await getRecords(TABLES.KHACH_HANG, {
      limit: 1, sort: '-Id',
      fields: 'Mã KH,Id',
    })
    const khCuoi = result.list?.[0]
    if (khCuoi?.['Mã KH']) {
      const ma = khCuoi['Mã KH'] as string
      const parts = ma.split('-')
      const so = parseInt(parts[parts.length - 1] || '0')
      if (!isNaN(so)) return `KH-${String(so + 1).padStart(3, '0')}`
    }
    return 'KH-001'
  } catch {
    return `KH-${Date.now().toString().slice(-4)}`
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q      = searchParams.get('q') || ''
    const limit  = Number(searchParams.get('limit') || 200)
    const offset = Number(searchParams.get('offset') || 0)

    const where = q ? `(Tên khách hàng,like,%${q}%)` : undefined

    const result = await getRecords(TABLES.KHACH_HANG, {
      where, limit, offset,
      sort: '-Ngày tạo,-Id',
      fields: 'Id,Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng,Ghi chú,Ngày tạo',
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

    // Tự tạo Mã KH trước khi lưu
    const maKH = await taoMaKHMoi()

    const result = await createRecord(TABLES.KHACH_HANG, {
      ...body,
      'Mã KH': maKH,
      'Ngày tạo': body['Ngày tạo'] || new Date().toISOString().split('T')[0],
    })

    if (!result) return NextResponse.json({ message: 'Lỗi tạo khách hàng' }, { status: 500 })

    return NextResponse.json({
      success: true,
      data: result,
      'Mã KH': result['Mã KH'] || maKH,
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

// app/api/khach-hang/route.ts — v3.0
// Thêm PATCH (sửa) và DELETE (xóa)

import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaKHMoi(): Promise<string> {
  try {
    const result = await getRecords(TABLES.KHACH_HANG, {
      limit: 1, sort: '-Id', fields: 'Mã KH,Id',
    })
    const khCuoi = result.list?.[0]
    if (khCuoi?.['Mã KH']) {
      const parts = (khCuoi['Mã KH'] as string).split('-')
      const so    = parseInt(parts[parts.length - 1] || '0')
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
    const limit  = Number(searchParams.get('limit')  || 300)
    const offset = Number(searchParams.get('offset') || 0)
    const where  = q ? `(Tên khách hàng,like,%${q}%)` : undefined

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

    const body  = await request.json()
    const maKH  = await taoMaKHMoi()
    const result = await createRecord(TABLES.KHACH_HANG, {
      ...body,
      'Mã KH':    maKH,
      'Ngày tạo': body['Ngày tạo'] || new Date().toISOString().split('T')[0],
    })
    if (!result) return NextResponse.json({ message: 'Lỗi tạo khách hàng' }, { status: 500 })

    return NextResponse.json({
      success: true,
      data:    result,
      'Mã KH': result['Mã KH'] || maKH,
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body      = await request.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    const result = await updateRecord(TABLES.KHACH_HANG, Number(id), updateData)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    const ok = await deleteRecord(TABLES.KHACH_HANG, Number(id))
    if (!ok) return NextResponse.json({ message: 'Lỗi xóa khách hàng' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

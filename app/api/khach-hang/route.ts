// app/api/khach-hang/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q      = searchParams.get('q') || ''
    const limit  = Number(searchParams.get('limit') || 200)
    const offset = Number(searchParams.get('offset') || 0)

    const where = q
      ? `(Tên khách hàng,like,%${q}%)`
      : undefined

    const result = await getRecords(TABLES.KHACH_HANG, {
      where, limit, offset,
      sort: 'Tên khách hàng',
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
    const result = await createRecord(TABLES.KHACH_HANG, body)

    if (!result) return NextResponse.json({ message: 'Lỗi tạo khách hàng' }, { status: 500 })
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

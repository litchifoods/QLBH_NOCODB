// app/api/don-hang/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const result = await createRecord(TABLES.DON_HANG, body)

    if (!result) return NextResponse.json({ message: 'Lỗi tạo đơn hàng' }, { status: 500 })

    return NextResponse.json({ success: true, data: result })
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

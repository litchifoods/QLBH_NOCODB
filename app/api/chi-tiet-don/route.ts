// app/api/chi-tiet-don/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body   = await request.json()
    const result = await createRecord(TABLES.CHI_TIET_DON, body)

    if (!result) return NextResponse.json({ message: 'Lỗi tạo chi tiết đơn' }, { status: 500 })

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
    const maDon = searchParams.get('maDon')

    const result = await getRecords(TABLES.CHI_TIET_DON, {
      where: maDon ? `(Mã đơn hàng,eq,${maDon})` : undefined,
      limit: 100,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

// app/api/giao-hang/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, getTableId, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const maDon = searchParams.get('maDon')
    const limit = Number(searchParams.get('limit') || 100)

    const result = await getRecords(TABLES.GIAO_HANG, {
      where: maDon ? `(Mã đơn hàng,eq,${maDon})` : undefined,
      limit,
      sort: '-Ngày giao',
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

    // Tạo chuyến giao hàng
    const result = await createRecord(TABLES.GIAO_HANG, body)
    if (!result) return NextResponse.json({ message: 'Lỗi tạo giao hàng' }, { status: 500 })

    // Cập nhật trạng thái đơn hàng thành "Đang giao"
    if (body['Mã đơn hàng']) {
      const donResult = await getRecords(TABLES.DON_HANG, {
        where: `(Mã đơn hàng,eq,${body['Mã đơn hàng']})`,
        limit: 1,
      })
      const don = donResult.list?.[0]
      if (don) {
        const rowId = don['Id'] || don['id']
        if (rowId) {
          await updateRecord(TABLES.DON_HANG, Number(rowId), { 'Trạng thái': 'Đang giao' })
        }
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

// app/api/doi-soat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const { maGiaoHang, tienThu, ghiChu, hoanThanhDon } = body

    // Tìm record giao hàng
    const result = await getRecords(TABLES.GIAO_HANG, {
      where: `(Mã giao hàng,eq,${maGiaoHang})`, limit: 1,
    })
    const giaoHang = result.list?.[0]
    if (!giaoHang) return NextResponse.json({ message: 'Không tìm thấy chuyến giao' }, { status: 404 })

    const rowId = giaoHang['Id'] || giaoHang['id']
    if (!rowId) return NextResponse.json({ message: 'Không xác định được ID' }, { status: 400 })

    // Cập nhật đối soát
    await updateRecord(TABLES.GIAO_HANG, Number(rowId), {
      'Tình trạng đối soát': 'Đã đối soát',
      'Tiền thu từ KH':      tienThu || 0,
      'Ghi chú đối soát':    ghiChu || '',
    })

    // Nếu hoàn thành đơn — cập nhật trạng thái đơn hàng
    if (hoanThanhDon && giaoHang['Mã đơn hàng']) {
      const donResult = await getRecords(TABLES.DON_HANG, {
        where: `(Mã đơn hàng,eq,${giaoHang['Mã đơn hàng']})`, limit: 1,
      })
      const don = donResult.list?.[0]
      if (don) {
        const donId = don['Id'] || don['id']
        if (donId) await updateRecord(TABLES.DON_HANG, Number(donId), { 'Trạng thái': 'Hoàn thành' })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

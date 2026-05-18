// app/api/don-hang/[maDon]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, updateRecord, getTableId, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

// Lấy chi tiết 1 đơn hàng + chi tiết sản phẩm
export async function GET(
  request: NextRequest,
  { params }: { params: { maDon: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { maDon } = params

    // Lấy đơn hàng
    const donHangResult = await getRecords(TABLES.DON_HANG, {
      where: `(Mã đơn hàng,eq,${maDon})`,
      limit: 1,
    })
    const donHang = donHangResult.list?.[0]
    if (!donHang) return NextResponse.json({ message: 'Không tìm thấy đơn hàng' }, { status: 404 })

    // Lấy chi tiết sản phẩm trong đơn
    const chiTietResult = await getRecords(TABLES.CHI_TIET_DON, {
      where: `(Mã đơn hàng,eq,${maDon})`,
      limit: 50,
    })

    // Lấy thông tin khách hàng
    let khachHang = null
    if (donHang['Mã KH']) {
      const khResult = await getRecords(TABLES.KHACH_HANG, {
        where: `(Mã KH,eq,${donHang['Mã KH']})`,
        limit: 1,
      })
      khachHang = khResult.list?.[0] || null
    }

    // Lấy thông tin giao hàng
    const giaoHangResult = await getRecords(TABLES.GIAO_HANG, {
      where: `(Mã đơn hàng,eq,${maDon})`,
      limit: 10,
    })

    return NextResponse.json({
      donHang,
      chiTiet: chiTietResult.list || [],
      khachHang,
      giaoHang: giaoHangResult.list || [],
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

// Cập nhật trạng thái đơn hàng
export async function PATCH(
  request: NextRequest,
  { params }: { params: { maDon: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { maDon } = params
    const body = await request.json()

    // Tìm rowId của đơn hàng
    const donHangResult = await getRecords(TABLES.DON_HANG, {
      where: `(Mã đơn hàng,eq,${maDon})`,
      limit: 1,
    })
    const donHang = donHangResult.list?.[0]
    if (!donHang) return NextResponse.json({ message: 'Không tìm thấy đơn hàng' }, { status: 404 })

    const rowId = donHang['Id'] || donHang['id'] || donHang['row_id']
    if (!rowId) return NextResponse.json({ message: 'Không xác định được ID đơn hàng' }, { status: 400 })

    const result = await updateRecord(TABLES.DON_HANG, Number(rowId), body)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

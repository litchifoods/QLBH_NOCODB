// app/api/giao-hang/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const maDon = searchParams.get('maDon')
    const result = await getRecords(TABLES.GIAO_HANG, {
      where: maDon ? `(Mã đơn hàng,eq,${maDon})` : undefined,
      limit: 200, sort: '-Ngày giao',
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
    const { maDon, ngayGiao, ghiChuChuyen, danhSachNguoi } = body

    // Tạo mã chuyến chung
    const maChuyen = `CH-${maDon}-${Date.now().toString().slice(-5)}`
    let soNguoiTao = 0

    // Mỗi người = 1 dòng trong bảng 7
    for (let i = 0; i < danhSachNguoi.length; i++) {
      const nguoi = danhSachNguoi[i]
      const maGH = `GH-${maChuyen}-${i + 1}`

      await createRecord(TABLES.GIAO_HANG, {
        'Mã giao hàng':        maGH,
        'Mã chuyến':           maChuyen,
        'Mã đơn hàng':         maDon,
        'Ngày giao':           ngayGiao,
        'Hình thức giao':      nguoi.hinhThuc,
        'Mã NV/đối tác':       nguoi.maNV || '',
        'Tên NV/đối tác':      nguoi.tenNV,
        'Vai trò chuyến':      nguoi.vaiTro,
        'Chi phí VC':          nguoi.chiPhiVC || 0,
        'Chi phí lắp đặt':     nguoi.chiPhiLap || 0,
        'Thưởng chuyến':       nguoi.thuongChuyen || 0,
        'Trạng thái':          'Đang giao',
        'Tình trạng đối soát': 'Chưa đối soát',
        'Ghi chú':             nguoi.ghiChu || ghiChuChuyen || '',
      })
      soNguoiTao++
    }

    // Cập nhật trạng thái đơn hàng → Đang giao
    const donResult = await getRecords(TABLES.DON_HANG, {
      where: `(Mã đơn hàng,eq,${maDon})`, limit: 1,
    })
    const don = donResult.list?.[0]
    if (don) {
      const rowId = don['Id'] || don['id']
      if (rowId) await updateRecord(TABLES.DON_HANG, Number(rowId), { 'Trạng thái': 'Đang giao' })
    }

    return NextResponse.json({ success: true, maChuyen, soNguoi: soNguoiTao })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

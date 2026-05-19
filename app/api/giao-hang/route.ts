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
    const { maDon, dotGiao, ngayGiao, danhSachNguoi, danhSachSP } = body

    // Tạo mã chuyến duy nhất
    const maChuyen = `CH-${maDon}-${dotGiao}-${Date.now().toString().slice(-4)}`

    let soNguoiTao = 0

    // Tạo từng dòng GH cho từng người
    for (let i = 0; i < danhSachNguoi.length; i++) {
      const nguoi = danhSachNguoi[i]
      const maGH = `GH-${maDon}-${dotGiao}-${i+1}-${Date.now().toString().slice(-4)}`

      await createRecord(TABLES.GIAO_HANG, {
        'Mã giao hàng':        maGH,
        'Mã chuyến':           maChuyen,
        'Mã đơn hàng':         maDon,
        'Đợt giao':            dotGiao,
        'Ngày giao':           ngayGiao,
        'Hình thức giao':      nguoi.hinhThuc,   // 'NV cửa hàng' | 'Đối tác'
        'Mã NV/đối tác':       nguoi.maNV,
        'Tên NV/đối tác':      nguoi.tenNV,
        'Vai trò chuyến':      nguoi.vaiTro,     // 'Vận chuyển' | 'Lắp đặt' | 'Vận chuyển+Lắp'
        'Chi phí VC':          nguoi.chiPhiVC || 0,
        'Chi phí lắp đặt':     nguoi.chiPhiLap || 0,
        'Thưởng chuyến':       nguoi.thuongChuyen || 0,
        'Trạng thái':          'Đang giao',
        'Tình trạng đối soát': 'Chưa đối soát',
        'Ghi chú':             nguoi.ghiChu || '',
      })
      soNguoiTao++
    }

    // Tạo chi tiết sản phẩm giao (bảng 8)
    for (let i = 0; i < danhSachSP.length; i++) {
      const sp = danhSachSP[i]
      await createRecord(TABLES.CHI_TIET_GIAO, {
        'Mã CT giao hàng':      `CTGH-${maChuyen}-${i+1}`,
        'Mã giao hàng':         maChuyen, // liên kết theo mã chuyến
        'Mã đơn hàng':          maDon,
        'Mã chi tiết đơn':      sp.maChiTiet,
        'Tên SP (ghi nhanh)':   sp.tenSP,
        'Số lượng đơn':         sp.soLuongDon,
        'Số lượng giao đợt này':sp.soLuongGiao,
        'Đợt giao':             dotGiao,
        'Trạng thái':           'Chờ giao',
        'Ghi chú':              sp.ghiChu || '',
      })
    }

    // Cập nhật trạng thái đơn hàng thành "Đang giao"
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

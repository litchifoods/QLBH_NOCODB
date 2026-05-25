// app/api/giao-hang/route.ts -- v3.2
// Fix: bảng 8 lưu Mã giao hàng = GH-xxx (giống bảng 7), không phải maChuyen
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
    const { maDon, ngayGiao, ghiChuChuyen, danhSachNguoi, danhSachSP } = body

    const ts       = Date.now().toString().slice(-5)
    const maChuyen = `CH-${maDon}-${ts}`

    // 1. Tạo từng GH-xxx cho mỗi người (bảng 7)
    // Lưu lại danh sách maGH để dùng cho bảng 8
    const danhSachMaGH: string[] = []

    for (let i = 0; i < danhSachNguoi.length; i++) {
      const nguoi  = danhSachNguoi[i]
      const maGH   = `GH-${maChuyen}-${i + 1}`
      danhSachMaGH.push(maGH)

      await createRecord(TABLES.GIAO_HANG, {
        'Mã giao hàng':        maGH,
        'Mã chuyến':           maChuyen,
        'Mã đơn hàng':         maDon,
        'Ngày giao':           ngayGiao,
        'Hình thức giao':      nguoi.hinhThuc,
        'Mã NV/đối tác':       nguoi.maNV || '',
        'Tên NV/đối tác':      nguoi.tenNV,
        'Vai trò chuyến':      nguoi.vaiTroChuyen,
        'Chi phí VC':          0,
        'Chi phí lắp đặt':     0,
        'Thưởng chuyến':       0,
        'Trạng thái':          'Đang giao',
        'Tình trạng đối soát': 'Chưa đối soát',
        'Ghi chú':             nguoi.ghiChu || ghiChuChuyen || '',
      })
    }

    // 2. Tạo chi tiết SP giao (bảng 8)
    // Mỗi SP giao được gắn với TẤT CẢ người trong chuyến
    // (vì SP giao 1 lần, nhiều người cùng thực hiện)
    // Dùng maGH của người đầu tiên làm đại diện
    const maGHDaiDien = danhSachMaGH[0] || `GH-${maChuyen}-1`

    for (let i = 0; i < danhSachSP.length; i++) {
      const sp = danhSachSP[i]
      await createRecord(TABLES.CHI_TIET_GIAO, {
        'Mã CT giao hàng':       `CTGH-${maChuyen}-${i + 1}`,
        'Mã giao hàng':          maGHDaiDien,  // ✅ dùng GH-xxx thay vì maChuyen
        'Mã chuyến':             maChuyen,
        'Mã đơn hàng':           maDon,
        'Mã chi tiết đơn':       sp.maChiTiet,
        'Tên SP (ghi nhanh)':    sp.tenSP,
        'Số lượng giao đợt này': sp.soLuongGiao,
        'Trạng thái':            'Chờ giao',
        'Ghi chú':               sp.ghiChu || '',
      })
    }

    // 3. Cập nhật trạng thái đơn → Đang giao
    const donResult = await getRecords(TABLES.DON_HANG, {
      where: `(Mã đơn hàng,eq,${maDon})`, limit: 1,
    })
    const don = donResult.list?.[0]
    if (don) {
      const rowId     = don['Id'] || don['id']
      const ttHienTai = don['Trạng thái'] || ''
      if (rowId && (ttHienTai === 'Chờ giao' || !ttHienTai)) {
        await updateRecord(TABLES.DON_HANG, Number(rowId), { 'Trạng thái': 'Đang giao' })
      }
    }

    return NextResponse.json({
      success: true, maChuyen,
      soNguoi: danhSachNguoi.length,
      soSP:    danhSachSP.length,
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

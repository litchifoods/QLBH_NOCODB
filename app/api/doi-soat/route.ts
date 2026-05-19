// app/api/doi-soat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const {
      maGiaoHang,      // GH-xxx (1 người)
      maChuyen,        // CH-xxx (chuyến)
      maDon,
      maNVDoiTac,
      tenNVDoiTac,
      hinhThucGiao,    // NV cửa hàng | Đối tác
      // Tiền thu từ KH (chỉ nhập cho người đại diện thu tiền)
      tienThuKH,
      hinhThucThu,     // Tiền mặt | Chuyển khoản | Tiền mặt+chuyển khoản | KH nợ
      // Chi phí thực tế trả cho người này
      chiPhiVC,
      chiPhiLap,
      thuongChuyen,
      // Kết quả
      ketQua,          // Thành công | Hoàn trả | Đổi hàng
      ghiChu,
      // Có đánh dấu đơn hoàn thành không
      hoanThanhDon,
    } = body

    // Tạo bản ghi đối soát (bảng 9)
    const maDS = `DS-${maGiaoHang}-${Date.now().toString().slice(-4)}`
    await createRecord(TABLES.DOI_SOAT, {
      'Mã đối soát':          maDS,
      'Mã giao hàng':         maGiaoHang,
      'Mã chuyến':            maChuyen,
      'Mã đơn hàng':          maDon,
      'Mã NV/Đối tác':        maNVDoiTac,
      'Tên NV/đối tác giao hàng': tenNVDoiTac,
      'Còn phải thu KH':      tienThuKH || 0,
      'Đã thu được':          tienThuKH || 0,
      'Hình thức thu':        hinhThucThu || 'Tiền mặt',
      'Chi phí VC':           chiPhiVC || 0,
      'Chi phí lắp đặt':      chiPhiLap || 0,
      'Kết quả':              ketQua || 'Thành công',
      'Tình trạng đối soát':  'Đã đối soát',
      'Ghi chú':              ghiChu || '',
    })

    // Cập nhật tình trạng đối soát trong bảng 7
    const ghResult = await getRecords(TABLES.GIAO_HANG, {
      where: `(Mã giao hàng,eq,${maGiaoHang})`, limit: 1,
    })
    const gh = ghResult.list?.[0]
    if (gh) {
      const rowId = gh['Id'] || gh['id']
      if (rowId) {
        await updateRecord(TABLES.GIAO_HANG, Number(rowId), {
          'Tình trạng đối soát': 'Đã đối soát',
          'Trạng thái': ketQua === 'Thành công' ? 'Đã giao' : ketQua === 'Hoàn trả' ? 'Hoàn trả' : 'Đổi hàng',
        })
      }
    }

    // Nếu hoàn thành đơn
    if (hoanThanhDon) {
      const donResult = await getRecords(TABLES.DON_HANG, {
        where: `(Mã đơn hàng,eq,${maDon})`, limit: 1,
      })
      const don = donResult.list?.[0]
      if (don) {
        const rowId = don['Id'] || don['id']
        if (rowId) await updateRecord(TABLES.DON_HANG, Number(rowId), { 'Trạng thái': 'Hoàn thành' })
      }
    }

    return NextResponse.json({ success: true, maDS })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

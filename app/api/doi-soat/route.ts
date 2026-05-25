// app/api/doi-soat/route.ts -- v4.0
// Tự động cập nhật Còn phải thu sau đối soát, không cần checkbox thủ công
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const {
      maGiaoHang, maChuyen, maDon,
      maNVDoiTac, tenNVDoiTac, hinhThucGiao,
      tienThuKH, hinhThucThu,
      chiPhiVC, chiPhiLap, thuongChuyen,
      ketQua, ghiChu,
    } = body
    console.log('[DOI-SOAT] maGiaoHang:', maGiaoHang, 'maDon:', maDon, 'tienThuKH:', tienThuKH)

    // 1. Tạo bản ghi đối soát vào bảng 9
    const maDS = `DS-${maGiaoHang}-${Date.now().toString().slice(-4)}`
    await createRecord(TABLES.DOI_SOAT, {
      'Mã đối soát':              maDS,
      'Mã giao hàng':             maGiaoHang,
      'Mã đơn hàng':              maDon,
      'Mã NV/Đối tác':            maNVDoiTac || '',
      'Tên NV/đối tác giao hàng': tenNVDoiTac || '',
      'Còn phải thu KH':          tienThuKH || 0,
      'Đã thu được':              tienThuKH || 0,
      'Hình thức thu':            hinhThucThu || 'Tiền mặt',
      'Chi phí VC':               chiPhiVC || 0,
      'Chi phí lắp đặt':          chiPhiLap || 0,
      'Kết quả':                  ketQua || 'Thành công',
      'Tình trạng đối soát':      'Đã đối soát',
      'Ghi chú':                  ghiChu || '',
    })

    // 2. Cập nhật bảng 7 — tình trạng đối soát
    const ghResult = await getRecords(TABLES.GIAO_HANG, {
      where: `(Mã giao hàng,eq,${maGiaoHang})`, limit: 1,
    })
    const gh = ghResult.list?.[0]
    if (gh) {
      const rowId = gh['Id'] || gh['id']
      if (rowId) {
        let trangThaiChuyen = 'Đã giao'
        if (ketQua.includes('Huỷ')) trangThaiChuyen = 'Hoàn trả'
        if (ketQua.includes('Đổi')) trangThaiChuyen = 'Đổi hàng'
        await updateRecord(TABLES.GIAO_HANG, Number(rowId), {
          'Tình trạng đối soát': 'Đã đối soát',
          'Trạng thái':          trangThaiChuyen,
        })
      }
    }

    // 3. Tự động cập nhật đơn hàng sau đối soát
    if (maDon) {
      const donResult = await getRecords(TABLES.DON_HANG, {
        where: `(Mã đơn hàng,eq,${maDon})`, limit: 1,
      })
      const don = donResult.list?.[0]
      if (don) {
        const rowId    = don['Id'] || don['id']
        const datCoc   = Number(don['Đặt cọc'] || 0)
        const tongTien = Number(don['Tổng tiền đơn'] || 0)

        // Lấy tất cả Mã giao hàng của đơn này
        const ghCuaDon = await getRecords(TABLES.GIAO_HANG, {
          where: `(Mã đơn hàng,eq,${maDon})`,
          limit: 50,
          fields: 'Mã giao hàng',
        })
        const danhSachMaGH = (ghCuaDon.list || []).map((g: any) => g['Mã giao hàng']).filter(Boolean)

        // Tính tổng tiền đã thu qua đối soát — tìm theo Mã giao hàng
        let tongDaThu = 0
        for (const maGH of danhSachMaGH) {
          const dsResult = await getRecords(TABLES.DOI_SOAT, {
            where: `(Mã giao hàng,eq,${maGH})`,
            limit: 10,
            fields: 'Đã thu được,Hình thức thu,Tình trạng đối soát',
          })
          for (const ds of (dsResult.list || [])) {
            if (ds['Tình trạng đối soát'] === 'Đã đối soát' &&
                ds['Hình thức thu'] !== 'KH nợ — chưa thu') {
              tongDaThu += Number(ds['Đã thu được'] || 0)
            }
          }
        }

        // Còn phải thu = Tổng tiền - Cọc - Đã thu qua đối soát
        const conLaiMoi = Math.max(0, tongTien - datCoc - tongDaThu)

        if (rowId) {
          await updateRecord(TABLES.DON_HANG, Number(rowId), {
            'Còn phải thu': conLaiMoi,
          })
        }
      }
    }

    return NextResponse.json({ success: true, maDS })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

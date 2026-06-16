import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()

    // Xử lý loại da-thu: chỉ cập nhật trạng thái đơn, không tạo bản ghi đối soát
    console.log('[DA-THU] loai:', body.loai, 'maDon:', body.maDon)
    if (body.loai === 'da-thu') {
      const { maDon, tienThuKH, hinhThucThu, ngayDoiSoat } = body
      if (maDon) {
        const donR = await getRecords(TABLES.DON_HANG, {
          where: `(Mã đơn hàng,eq,${maDon})`, limit: 1
        })
        const don = donR.list?.[0]
        if (don?.['Id']) {
          const tongTien = Number(don['Tổng tiền đơn']||0)
          const datCoc   = Number(don['Đặt cọc']||0)
          const conPhaiThu = Math.max(0, tongTien - datCoc - Number(tienThuKH||0))
          console.log('[DA-THU] tongTien:', tongTien, 'datCoc:', datCoc, 'tienThuKH:', tienThuKH, 'conPhaiThu:', conPhaiThu)
          await updateRecord(TABLES.DON_HANG, Number(don['Id']), {
            'Trạng thái':   'Đã thu chưa đối soát',
            'Còn phải thu': conPhaiThu,
          })
        }
      }
      revalidatePath('/dashboard/doi-soat')
      revalidatePath('/dashboard/don-hang')
      return NextResponse.json({ success: true })
    }

    // Xử lý đối soát thông thường
    const {
      maGiaoHang, maChuyen, maDon,
      maNVDoiTac, tenNVDoiTac, hinhThucGiao,
      tienThuKH, hinhThucThu,
      chiPhiVC, chiPhiLap, thuongChuyen,
      ketQua, ghiChu, ngayDoiSoat, thanhToanNgay, hinhThucTTDT,
    } = body
    console.log('[DOI-SOAT] thanhToanNgay:', thanhToanNgay, 'hinhThucTTDT:', hinhThucTTDT)
    console.log('[DOI-SOAT] maGiaoHang:', maGiaoHang, 'maDon:', maDon, 'tienThuKH:', tienThuKH)

    // 1. Tạo bản ghi đối soát vào bảng 9
    const maDS = `DS-${maGiaoHang}-${Date.now().toString().slice(-4)}`
    await createRecord(TABLES.DOI_SOAT, {
      'Mã đối soát':              maDS,
      'Mã giao hàng':             maGiaoHang,
      'Mã NV/Đối tác':            maNVDoiTac || '',
      'Tên NV/đối tác giao hàng': tenNVDoiTac || '',
      'Còn phải thu KH':          tienThuKH || 0,
      'Đã thu được':              tienThuKH || 0,
      'Hình thức thu':            hinhThucThu || 'Tiền mặt',
      'Chi phí VC':               chiPhiVC || 0,
      'Chi phí lắp đặt':          chiPhiLap || 0,
      'Thưởng chuyến':            thuongChuyen || 0,
      'Hình thức thanh toán':     body.hinhThucChi || 'Tiền mặt',
      'Kết quả':                  ketQua || 'Thành công',
      'Tình trạng đối soát':      'Đã đối soát',
      'Ghi chú':                  ghiChu || '',
      'Ngày đối soát':            ngayDoiSoat || new Date().toISOString().split('T')[0],
      'Đã chi trả':               thanhToanNgay ? true : false,
      'Mã đơn hàng':                maDon || '',
      'Tình trạng nộp tiền':        body.tinhTrangNopTien || '',
      'Ngày nộp tiền':              body.ngayNopTien || '',
      'Tình trạng nộp tiền':        body.tinhTrangNopTien || null,
      'Ngày nộp tiền':              body.ngayNopTien || null,
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
        const ghCuaDon = await getRecords(TABLES.GIAO_HANG, {
          where: `(Mã đơn hàng,eq,${maDon})`,
          limit: 50,
          fields: 'Mã giao hàng',
        })
        const danhSachMaGH = (ghCuaDon.list || []).map((g: any) => g['Mã giao hàng']).filter(Boolean)
        let tongDaThu = 0
        for (const maGH of danhSachMaGH) {
          const dsResult = await getRecords(TABLES.DOI_SOAT, {
            where: `(Mã giao hàng,eq,${maGH})`,
            limit: 10,
            fields: 'Đã thu được,Hình thức thu,Tình trạng đối soát',
          })
          for (const ds of (dsResult.list || [])) {
            if (ds['Tình trạng đối soát'] === 'Đã đối soát' &&
                ds['Hình thức thu'] !== 'KH nợ - chưa thu') {
              tongDaThu += Number(ds['Đã thu được'] || 0)
            }
          }
        }
        // Thêm tiền vừa thu
        if (hinhThucThu !== 'KH nợ - chưa thu') {
          tongDaThu += Number(tienThuKH || 0)
        }
        const conPhaiThu = Math.max(0, tongTien - datCoc - tongDaThu)
        if (rowId) {
          console.log('[DOI-SOAT] cap nhat trang thai don:', rowId, 'ketQua:', ketQua)
          const ttMoi = ketQua && ketQua.includes('Huỷ') ? 'Huỷ' : 'Đã giao'
          await updateRecord(TABLES.DON_HANG, Number(rowId), {
            'Còn phải thu': conPhaiThu,
            'Trạng thái':   ttMoi,
          })
        }
      }
    }
    revalidatePath('/dashboard/chi-tra-nv')
    revalidatePath('/dashboard/doi-soat')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}


export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })
    await updateRecord(TABLES.DOI_SOAT, Number(id), data)
    revalidatePath('/dashboard/nhan-vien')
    revalidatePath('/dashboard/doi-soat')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}


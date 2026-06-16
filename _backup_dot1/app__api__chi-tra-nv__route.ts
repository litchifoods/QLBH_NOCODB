import { NextRequest, NextResponse } from 'next/server'
import { createRecord, updateRecord, getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const {
      thang, maNV, tenNV, vaiTro,
      luongCoBan, soNgayCong, luongThucNhan,
      soDonBan, tongDoanhSo, pctThuongDS, thuongDoanhSo,
      soChuyenGiao, tongCPChuyen,
      thuongKhac, tamUng, tongChiTra,
      hinhThucTT, ghiChu
    } = body

    const r = await createRecord(TABLES.CHI_TRA_NV, {
      'Tháng':               thang,
      'Mã NV/đối tác':       maNV,
      'Tên NV/đối tác':      tenNV,
      'Vai trò':             vaiTro||'',
      'Lương cơ bản':        luongCoBan||0,
      'Số ngày công':        soNgayCong||0,
      'Lương thực nhận':     luongThucNhan||0,
      'Số đơn bán được':     soDonBan||0,
      'Tổng doanh số':       tongDoanhSo||0,
      '% Thưởng DS':         pctThuongDS||0,
      'Thưởng doanh số':     thuongDoanhSo||0,
      'Số chuyến giao':      soChuyenGiao||0,
      'Tổng chi phí chuyến': tongCPChuyen||0,
      'Tổng chi trả':        tongChiTra||0,
      'Tạm ứng tháng':       tamUng||0,
      'Ngày thanh toán':     body.ngayChi||new Date().toISOString().split('T')[0],
      'Người duyệt':         session.hoTen||session.tenDangNhap||'',
      'Hình thức TT':        hinhThucTT||'Tiền mặt',
      'Trạng thái':          'Đã trả',
      'Ghi chú':             ghiChu||'',
    })
    return NextResponse.json({ success:true, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const { id, table, hinhThucTT, ghiChu, ...rest } = body
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    // Nếu là cập nhật bảng đối soát (đánh dấu đã chi trả)
    if (table === 'doi-soat') {
      const updateData: any = { 'Đã chi trả': true, 'Ghi chú': ghiChu||'', 'Ngày chi trả': body.ngayChi||new Date().toISOString().split('T')[0] }
      if (body.cpVC !== undefined) updateData['Chi phí VC'] = Number(body.cpVC||0)
      if (body.cpLap !== undefined) updateData['Chi phí lắp đặt'] = Number(body.cpLap||0)
      if (body.thuong !== undefined) updateData['Thưởng chuyến'] = Number(body.thuong||0)
      const r = await updateRecord(TABLES.DOI_SOAT, Number(id), updateData)
      return NextResponse.json({ success:true, data:r })
    }

    // Mặc định update bảng chi trả NV
    const r = await updateRecord(TABLES.CHI_TRA_NV, Number(id), rest)
    return NextResponse.json({ success:true, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

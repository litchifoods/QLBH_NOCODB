// app/api/chuong-trinh-ncc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, createRecord, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

const TBL_CT = '19_Chương trình NCC'
const TBL_CT_CT = '20_Chi tiết CT NCC'

function maCT(year:number, seq:number){
  return `CT-NCC-${year}-${String(seq).padStart(3,'0')}`
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const maNCC = req.nextUrl.searchParams.get('maNCC')||''
    const [ct, ctct] = await Promise.all([
      getRecords(TBL_CT, { limit: 500, sort: '-Id', where: maNCC?`(Mã NCC,eq,${maNCC})`:undefined }),
      getRecords(TBL_CT_CT, { limit: 1000, sort: '-Id' }),
    ])
    return NextResponse.json({ ctList: ct.list||[], chiTietCTList: ctct.list||[] })
  } catch(e:any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    const year = new Date().getFullYear()

    if (body.loai === 'chi-tiet') {
      // Tạo chi tiết SP
      const r = await createRecord(TBL_CT_CT, {
        'Mã CT': body.maCT,
        'Mã NCC': body.maNCC,
        'Tên dòng SP': body.tenSP,
        'Mã SP': body.maSP||'',
        'Giá niêm yết': body.giaNY||0,
        '% CK cơ bản': body.ckCB||0,
        '% CK thêm': body.ckThem||0,
        '% CK tổng': body.ckTong||0,
        'Giá sau CK': body.giaSauCK||0,
        'Số lượng dự kiến': body.soLuong||0,
        'Ghi chú kích thước': body.ghiChu||'',
      })
      return NextResponse.json({ success: true, data: r })
    }

    // Tạo CT mới
    const existing = await getRecords(TBL_CT, { limit: 1, sort: '-Id', fields: 'Id,Mã CT' })
    const lastSeq = existing.list?.length > 0
      ? Number((existing.list[0]['Mã CT']||'').split('-').pop()||0) : 0
    const newMaCT = maCT(year, lastSeq + 1)

    const r = await createRecord(TBL_CT, {
      'Mã CT': newMaCT,
      'Mã NCC': body.maNCC,
      'Tên NCC': body.tenNCC||'',
      'Tên chương trình': body.tenCT,
      'Số thông báo': body.soThongBao||'',
      'Loại CT': body.loaiCT||'B - Gói cọc',
      'Ngày bắt đầu': body.ngayBD||null,
      'Ngày kết thúc': body.ngayKT||null,
      'Hạn giao hàng': body.hanGiaoHang||null,
      'Số tiền cọc yêu cầu': body.cocYeuCau||0,
      'Tiền đã cọc': body.daCoc||0,
      'Mục tiêu doanh số': body.mucTieu||0,
      'Đã tích lũy': body.daTichLuy||0,
      'Loại thưởng': body.loaiThuong||'',
      'Giá trị thưởng': body.giaTriThuong||0,
      'Trạng thái': body.trangThai||'Đang tham gia',
      'Ghi chú': body.ghiChu||'',
    })
    return NextResponse.json({ success: true, maCT: newMaCT, data: r })
  } catch(e:any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    const { id, loai, ...data } = body

    if (loai === 'chi-tiet') {
      await updateRecord(TBL_CT_CT, Number(id), {
        'Tên dòng SP': data.tenSP,
        'Mã SP': data.maSP||'',
        'Giá niêm yết': data.giaNY||0,
        '% CK cơ bản': data.ckCB||0,
        '% CK thêm': data.ckThem||0,
        '% CK tổng': data.ckTong||0,
        'Giá sau CK': data.giaSauCK||0,
        'Số lượng dự kiến': data.soLuong||0,
        'Ghi chú kích thước': data.ghiChu||'',
      })
      return NextResponse.json({ success: true })
    }

    await updateRecord(TBL_CT, Number(id), {
      'Tên chương trình': data.tenCT,
      'Số thông báo': data.soThongBao||'',
      'Loại CT': data.loaiCT||'B - Gói cọc',
      'Ngày bắt đầu': data.ngayBD||null,
      'Ngày kết thúc': data.ngayKT||null,
      'Hạn giao hàng': data.hanGiaoHang||null,
      'Số tiền cọc yêu cầu': data.cocYeuCau||0,
      'Tiền đã cọc': data.daCoc||0,
      'Mục tiêu doanh số': data.mucTieu||0,
      'Đã tích lũy': data.daTichLuy||0,
      'Loại thưởng': data.loaiThuong||'',
      'Giá trị thưởng': data.giaTriThuong||0,
      'Trạng thái': data.trangThai||'Đang tham gia',
      'Ghi chú': data.ghiChu||'',
    })
    return NextResponse.json({ success: true })
  } catch(e:any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const id = Number(req.nextUrl.searchParams.get('id'))
    const loai = req.nextUrl.searchParams.get('loai')||''
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })
    await deleteRecord(loai==='chi-tiet'?TBL_CT_CT:TBL_CT, id)
    return NextResponse.json({ success: true })
  } catch(e:any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

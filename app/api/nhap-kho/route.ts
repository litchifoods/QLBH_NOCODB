// app/api/nhap-kho/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES, writeLog } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaPhieu(): Promise<string> {
  try {
    const nam = new Date().getFullYear()
    const r = await getRecords(TABLES.NHAP_KHO, { limit:500, sort:'-Id', fields:'Mã phiếu nhập' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã phiếu nhập'] as string||''
      const parts = ma.split('-')
      const namMa = parseInt(parts[1]||'0')
      const so = parseInt(parts[parts.length-1]||'0')
      if (!isNaN(so) && so > maxSo && namMa===nam) maxSo = so
    }
    return `NK-${nam}-${String(maxSo+1).padStart(3,'0')}`
  } catch { return `NK-${Date.now().toString().slice(-6)}` }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const maPhieu = await taoMaPhieu()
    const tongTien = Number(body.slThucNhan||0) * Number(body.giaNhapTT||0)
    const r = await createRecord(TABLES.NHAP_KHO, {
      'Mã phiếu nhập': maPhieu,
      'Ngày nhập': body.ngayNhap || new Date().toISOString().split('T')[0],
      'Mã đặt hàng': body.maDatHang||'',
      'Mã CT': body.maCT||'',
      'Mã NCC': body.maNCC||'',
      'Mã SP': body.maSP||'',
      'Số lượng đặt': Number(body.slDat||0),
      'Giá nhập thực tế': Number(body.giaNhapTT||0),
      'Số lượng thực nhận': Number(body.slThucNhan||0),
      'Tổng tiền hàng': tongTien,
      'CP vận chuyển về kho': Number(body.cpVC||0),
      'Hình thức TT CP VC': body.hinhThucCPVC||'',
      'Trạng thái CP VC':   body.trangThaiCPVC||'',
      'Tình trạng hàng': (['Đủ','Thiếu','Thừa','Có hàng lỗi','Đã xử lý'].includes(body.tinhTrang) ? body.tinhTrang : 'Đủ'),
      'Ghi chú': body.ghiChu||'',
      'Người nhập': body.nguoiNhap||'',
    })
    if (!r) return NextResponse.json({message:'Lỗi tạo phiếu nhập'},{status:500})

    // Cập nhật tồn kho SP: chỉ cộng hàng tốt (trừ lỗi và chờ phụ kiện)
    if (body.maSP && Number(body.slThucNhan||0) > 0) {
      const slLoi = Number(body.slLoi||0)
      const slChoiPK = Number(body.slChoiPK||0)
      const slTot = Number(body.slThucNhan||0) - slLoi - slChoiPK
      if (slTot > 0) {
        const spResult = await getRecords(TABLES.SAN_PHAM, {
          where: `(Mã SP,eq,${body.maSP})`, limit:1, fields:'Id,Tồn kho'
        })
        const sp = spResult.list?.[0]
        if (sp) {
          const tonMoi = Number(sp['Tồn kho']||0) + slTot
          await updateRecord(TABLES.SAN_PHAM, Number(sp['Id']||sp['id']), {'Tồn kho': tonMoi})
        }
      }
    }
    // Cap nhat Da tich luy trong CT neu co Ma CT
    if (body.maCT && tongTien > 0) {
      try {
        const ctResult = await getRecords('19_Chương trình NCC', {
          where: `(Mã CT,eq,${body.maCT})`, limit: 1, fields: 'Id,Đã tích lũy'
        })
        const ct = ctResult.list?.[0]
        if (ct) {
          const daTLMoi = Number(ct['Đã tích lũy']||0) + tongTien
          await updateRecord('19_Chương trình NCC', Number(ct['Id']||ct['id']), {'Đã tích lũy': daTLMoi})
        }
      } catch(e) { /* bo qua */ }
    }
    return NextResponse.json({ success:true, maPhieu, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { id, slThucNhanCu, ...data } = await req.json()
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    // Tính lại tổng tiền
    if (data['Giá nhập thực tế'] && data['Số lượng thực nhận']) {
      data['Tổng tiền hàng'] = Number(data['Giá nhập thực tế'])*Number(data['Số lượng thực nhận'])
    }
    const r = await updateRecord(TABLES.NHAP_KHO, Number(id), data)
    // Cập nhật tồn kho chỉ khi slThucNhanCu được truyền vào rõ ràng
    if (data['Mã SP'] && slThucNhanCu !== undefined && slThucNhanCu !== null) {
      const diff = Number(data['Số lượng thực nhận']||0) - Number(slThucNhanCu)
      if (diff !== 0) {
        const spResult = await getRecords(TABLES.SAN_PHAM, {
          where: `(Mã SP,eq,${data['Mã SP']})`, limit:1, fields:'Id,Tồn kho'
        })
        const sp = spResult.list?.[0]
        if (sp) {
          await updateRecord(TABLES.SAN_PHAM, Number(sp['Id']||sp['id']), {
            'Tồn kho': Number(sp['Tồn kho']||0) + diff
          })
        }
      }
    }
    writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Cập nhật nhập kho',bang:'Nhập kho',
      maBanGhi:String(id),moTa:'Cập nhật phiếu SP: '+(data['Mã SP']||'')+' SL: '+(data['Số lượng thực nhận']||0)})
    return NextResponse.json({ success:true, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const maSP = searchParams.get('maSP')
    const slHoan = Number(searchParams.get('sl')||0)
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    await deleteRecord(TABLES.NHAP_KHO, Number(id))
    // Hoàn lại tồn kho
    if (maSP && slHoan > 0) {
      const spResult = await getRecords(TABLES.SAN_PHAM, {
        where: `(Mã SP,eq,${maSP})`, limit:1, fields:'Id,Tồn kho'
      })
      const sp = spResult.list?.[0]
      if (sp) {
        await updateRecord(TABLES.SAN_PHAM, Number(sp['Id']||sp['id']), {
          'Tồn kho': Math.max(0, Number(sp['Tồn kho']||0) - slHoan)
        })
      }
    }
    writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Xóa',bang:'Nhập kho',
      maBanGhi:String(id),moTa:'Xóa phiếu nhập kho id='+id})
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

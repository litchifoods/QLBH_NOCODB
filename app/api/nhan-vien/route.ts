// app/api/nhan-vien/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES, writeLog } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaNV(loai: string): Promise<string> {
  try {
    const prefix = loai === 'Đối tác' ? 'DT' : 'NV'
    const r = await getRecords(TABLES.NHAN_VIEN, { limit:500, sort:'-Id', fields:'Mã nhân viên' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã nhân viên'] as string||''
      if (!ma.startsWith(prefix+'-')) continue
      const so = parseInt(ma.replace(prefix+'-',''))
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    return `${prefix}-${String(maxSo+1).padStart(3,'0')}`
  } catch { return `NV-${Date.now().toString().slice(-4)}` }
}

async function taoMaCC(): Promise<string> {
  try {
    const r = await getRecords(TABLES.CHAM_CONG, { limit:500, sort:'-Id', fields:'Mã chấm công' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã chấm công'] as string||''
      const so = parseInt(ma.split('-').pop()||'0')
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    const now = new Date()
    return `CC-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(maxSo+1).padStart(3,'0')}`
  } catch { return `CC-${Date.now().toString().slice(-6)}` }
}

async function taoMaTU(): Promise<string> {
  try {
    const r = await getRecords(TABLES.TAM_UNG_NV, { limit:500, sort:'-Id', fields:'Mã tạm ứng' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã tạm ứng'] as string||''
      const so = parseInt(ma.split('-').pop()||'0')
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    const now = new Date()
    return `TU-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(maxSo+1).padStart(3,'0')}`
  } catch { return `TU-${Date.now().toString().slice(-6)}` }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(req.url)
    const loai  = searchParams.get('loai')
    const maNV  = searchParams.get('maNV')
    const thang = searchParams.get('thang')

    if (loai === 'cham-cong' && maNV) {
      const r = await getRecords(TABLES.CHAM_CONG, {
        where: `(Mã NV,eq,${maNV})`, limit:100, sort:'-Tháng',
        fields: 'Id,Mã chấm công,Tháng,Mã NV,Tên NV,Tổng ngày công chuẩn,Số ngày công thực tế,Số ngày nghỉ,Ghi chú'
      })
      return NextResponse.json(r)
    }

    if (loai === 'thuong-khac' && maNV) {
      const r = await getRecords(TABLES.THUONG_KHAC, {
        where: `(Mã nhân viên,eq,${maNV})`, limit:200, sort:'-Id',
        fields: 'Id,Mã thưởng,Tháng,Mã nhân viên,Tên NV,Loại thưởng,Số tiền,Hình thức,Lý do,Người duyệt,Ngày thưởng'
      })
      return NextResponse.json(r)
    }

    if (loai === 'tam-ung' && maNV) {
      const where = thang
        ? `(Mã NV/đối tác,eq,${maNV})~and(Tháng,eq,${thang})`
        : `(Mã NV/đối tác,eq,${maNV})`
      const r = await getRecords(TABLES.TAM_UNG_NV, {
        where, limit:200, sort:'-Id',
        fields: 'Id,Mã tạm ứng,Tháng,Mã NV/đối tác,Tên NV,Ngày tạm ứng,Số tiền,Hình thức,Người duyệt,Ghi chú'
      })
      return NextResponse.json(r)
    }

    // ── KIỂM TRA CÓ THỂ XÓA KHÔNG ──────────────────────────
    if (loai === 'kiem-tra-xoa' && maNV) {
      const [donHang, giaoHang, doiSoat, chamCong, tamUng] = await Promise.all([
        getRecords(TABLES.DON_HANG,   { where:`(Mã NV,eq,${maNV})`, limit:1, fields:'Id' }),
        getRecords(TABLES.GIAO_HANG,  { where:`(Mã NV/đối tác,eq,${maNV})`, limit:1, fields:'Id' }),
        getRecords(TABLES.DOI_SOAT,   { where:`(Mã NV/Đối tác,eq,${maNV})`, limit:1, fields:'Id' }),
        getRecords(TABLES.CHAM_CONG,  { where:`(Mã NV,eq,${maNV})`, limit:1, fields:'Id' }),
        getRecords(TABLES.TAM_UNG_NV, { where:`(Mã NV/đối tác,eq,${maNV})`, limit:1, fields:'Id' }),
      ])
      const lyDo: string[] = []
      if ((donHang.list||[]).length > 0)  lyDo.push('đã có đơn hàng')
      if ((giaoHang.list||[]).length > 0) lyDo.push('đã có chuyến giao')
      if ((doiSoat.list||[]).length > 0)  lyDo.push('đã có đối soát')
      if ((chamCong.list||[]).length > 0) lyDo.push('đã có chấm công')
      if ((tamUng.list||[]).length > 0)   lyDo.push('đã có tạm ứng')
      return NextResponse.json({ coTheXoa: lyDo.length === 0, lyDo })
    }

    // Lấy danh sách NV
    const r = await getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: '-Id',
      fields: 'Id,Mã nhân viên,Họ và Tên,Số điện thoại,Loại,Vai trò,Lương cơ bản,% Thưởng DS,Hình thức lương,Ngày phép/tháng,Số TK ngân hàng,Ngân hàng,Hình thức TT,Trạng thái,Ghi chú'
    })
    return NextResponse.json(r)
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const loai = body.loai

    if (loai === 'cham-cong') {
      const maChamCong = await taoMaCC()
      const r = await createRecord(TABLES.CHAM_CONG, {
        'Mã chấm công':         maChamCong,
        'Tháng':                body.thang,
        'Mã NV':                body.maNV,
        'Tên NV':               body.tenNV||'',
        'Tổng ngày công chuẩn': Number(body.tongNgayChuẩn||26),
        'Số ngày công thực tế': Number(body.ngayCongThucTe||0),
        'Số ngày nghỉ':         Number(body.ngayNghi||0),
        'Ghi chú':              body.ghiChu||'',
      })
      return NextResponse.json({ success:true, maChamCong, data:r })
    }

    if (loai === 'thuong-khac') {
      const maTK = `TK-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${Date.now().toString().slice(-4)}`
      const r = await createRecord(TABLES.THUONG_KHAC, {
        'Mã thưởng':     maTK,
        'Tháng':         body.thang,
        'Mã nhân viên':  body.maNV,
        'Tên NV':        body.tenNV||'',
        'Loại thưởng':   body.loaiThuong||'Thưởng khác',
        'Số tiền':       Number(body.soTien||0),
        'Hình thức':     body.hinhThuc||'Tiền mặt',
        'Lý do':         body.lyDo||'',
        'Người duyệt':   body.nguoiDuyet || session.hoTen || session.tenDangNhap,
        'Ngày thưởng':   body.ngayThuong || new Date().toISOString().split('T')[0],
      })
      return NextResponse.json({ success:true, maTK, data:r })
    }

    if (loai === 'tam-ung') {
      const maTU = await taoMaTU()
      const r = await createRecord(TABLES.TAM_UNG_NV, {
        'Mã tạm ứng':    maTU,
        'Tháng':         body.thang,
        'Mã NV/đối tác': body.maNV,
        'Tên NV':        body.tenNV||'',
        'Ngày tạm ứng':  body.ngayTamUng || new Date().toISOString().split('T')[0],
        'Số tiền':       Number(body.soTien||0),
        'Hình thức':     body.hinhThuc||'Tiền mặt',
        'Người duyệt':   body.nguoiDuyet || session.hoTen || session.tenDangNhap,
        'Ghi chú':       body.ghiChu||'',
      })
      writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Tạm ứng',bang:'Tạm ứng NV',
        maBanGhi:body.maNV||'',moTa:'Ghi tạm ứng: '+(body.tenNV||body.maNV||'')+' — '+(body.soTien||0)+'đ'})
      return NextResponse.json({ success:true, maTU, data:r })
    }

    // Tạo NV mới
    if (!body['Họ và Tên']?.trim()) return NextResponse.json({message:'Thiếu họ tên'},{status:400})
    const maNV = body['Mã nhân viên']?.trim() || await taoMaNV(body['Loại']||'Nhân viên')
    const r = await createRecord(TABLES.NHAN_VIEN, {
      'Mã nhân viên':     maNV,
      'Họ và Tên':        body['Họ và Tên'].trim(),
      'Số điện thoại':    body['Số điện thoại']||'',
      'Loại':             body['Loại']||'Nhân viên',
      'Vai trò':          body['Vai trò']||'',
      'Lương cơ bản':     Number(body['Lương cơ bản']||0),
      '% Thưởng DS':      Number(body['% Thưởng DS']||0),
      'Số TK ngân hàng':  body['Số TK ngân hàng']||'',
      'Ngân hàng':        body['Ngân hàng']||'',
      'Hình thức TT':     body['Hình thức TT']||'Chuyển khoản',
      'Trạng thái':       'Đang làm',
      'Ghi chú':          body['Ghi chú']||'',
    })
    writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Tạo',bang:'Nhân viên',
      maBanGhi:maNV,moTa:'Thêm NV/ĐT: '+(body['Họ và Tên']||maNV)})
    revalidatePath('/dashboard/nhan-vien')
    return NextResponse.json({ success:true, maNV, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const { id, loai, ...data } = body
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    if (loai === 'cham-cong') {
      const r = await updateRecord(TABLES.CHAM_CONG, Number(id), data)
      return NextResponse.json({ success:true, data:r })
    }
    if (loai === 'tam-ung') {
      const r = await updateRecord(TABLES.TAM_UNG_NV, Number(id), data)
      writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Sửa',bang:'Tạm ứng NV',
        maBanGhi:String(id),moTa:'Sửa tạm ứng id='+id})
      return NextResponse.json({ success:true, data:r })
    }
    const r = await updateRecord(TABLES.NHAN_VIEN, Number(id), data)
    writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Sửa',bang:'Nhân viên',
      maBanGhi:String(id),moTa:'Sửa NV id='+id})
    revalidatePath('/dashboard/nhan-vien')
    return NextResponse.json({ success:true, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    if (session.vaiTro !== 'Chủ cửa hàng') return NextResponse.json({message:'Không có quyền'},{status:403})
    const { searchParams } = new URL(req.url)
    const id   = searchParams.get('id')
    const loai = searchParams.get('loai')
    const maNV = searchParams.get('maNV')
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    if (loai === 'thuong-khac') {
      await deleteRecord(TABLES.THUONG_KHAC, Number(id))
      return NextResponse.json({ success:true })
    }
    if (loai === 'tam-ung') {
      await deleteRecord(TABLES.TAM_UNG_NV, Number(id))
      return NextResponse.json({ success:true })
    }

    // Xóa NV — kiểm tra lần cuối trước khi xóa
    if (maNV) {
      const [donHang, giaoHang, doiSoat] = await Promise.all([
        getRecords(TABLES.DON_HANG,  { where:`(Mã NV,eq,${maNV})`, limit:1, fields:'Id' }),
        getRecords(TABLES.GIAO_HANG, { where:`(Mã NV/đối tác,eq,${maNV})`, limit:1, fields:'Id' }),
        getRecords(TABLES.DOI_SOAT,  { where:`(Mã NV/Đối tác,eq,${maNV})`, limit:1, fields:'Id' }),
      ])
      if ((donHang.list||[]).length > 0)  return NextResponse.json({message:'Không thể xóa — nhân viên đã có đơn hàng. Hãy đổi trạng thái sang Nghỉ việc.'},{status:400})
      if ((giaoHang.list||[]).length > 0) return NextResponse.json({message:'Không thể xóa — nhân viên đã có chuyến giao. Hãy đổi trạng thái sang Nghỉ việc.'},{status:400})
      if ((doiSoat.list||[]).length > 0)  return NextResponse.json({message:'Không thể xóa — nhân viên đã có đối soát. Hãy đổi trạng thái sang Nghỉ việc.'},{status:400})
    }

    await deleteRecord(TABLES.NHAN_VIEN, Number(id))
    revalidatePath('/dashboard/nhan-vien')
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

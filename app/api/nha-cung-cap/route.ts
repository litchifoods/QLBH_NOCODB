// app/api/nha-cung-cap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaNCC(): Promise<string> {
  try {
    const r = await getRecords(TABLES.NHA_CUNG_CAP, { limit:500, sort:'-Id', fields:'Mã NCC' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã NCC'] as string||''
      const so = parseInt(ma.replace('NCC-',''))
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    return `NCC-${String(maxSo+1).padStart(3,'0')}`
  } catch { return `NCC-${Date.now().toString().slice(-4)}` }
}

async function taoMaTT(): Promise<string> {
  try {
    const r = await getRecords(TABLES.THANH_TOAN_NCC, { limit:500, sort:'-Id', fields:'Mã thanh toán' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã thanh toán'] as string||''
      const so = parseInt(ma.replace('TT-NCC-',''))
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    return `TT-NCC-${String(maxSo+1).padStart(4,'0')}`
  } catch { return `TT-NCC-${Date.now().toString().slice(-6)}` }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(req.url)
    const loai  = searchParams.get('loai')
    const maNCC = searchParams.get('maNCC')

    if (loai === 'thanh-toan' && maNCC) {
      const r = await getRecords(TABLES.THANH_TOAN_NCC, {
        where: `(Mã NCC,eq,${maNCC})`,
        limit: 500, sort: '-Id',
        fields: 'Id,Mã thanh toán,Ngày trả tiền NCC,Mã NCC,Mã phiếu nhập,Nội dung,Loại thanh toán,Số tiền trả,Hình thức,Người trả,Ghi chú,Số tiền còn lại sau TT,Trạng thái'
      })
      return NextResponse.json(r)
    }

    if (loai === 'nhap-kho' && maNCC) {
      const r = await getRecords(TABLES.NHAP_KHO, {
        where: `(Mã NCC,eq,${maNCC})`,
        limit: 500, sort: '-Id',
        fields: 'Id,Mã phiếu nhập,Ngày nhập,Mã SP,Số lượng thực nhận,Giá nhập thực tế,CP vận chuyển về kho,Tổng tiền hàng,Tình trạng hàng'
      })
      return NextResponse.json(r)
    }

    // Kiểm tra có thể xóa NCC không
    if (loai === 'kiem-tra-xoa' && maNCC) {
      const [nhapKho, thanhToan, datHang] = await Promise.all([
        getRecords(TABLES.NHAP_KHO,       { where:`(Mã NCC,eq,${maNCC})`, limit:1, fields:'Id' }),
        getRecords(TABLES.THANH_TOAN_NCC,  { where:`(Mã NCC,eq,${maNCC})`, limit:1, fields:'Id' }),
        getRecords(TABLES.DAT_HANG_NCC,    { where:`(Mã NCC,eq,${maNCC})`, limit:1, fields:'Id' }),
      ])
      const lyDo: string[] = []
      if ((nhapKho.list||[]).length > 0)   lyDo.push('đã có phiếu nhập kho')
      if ((thanhToan.list||[]).length > 0) lyDo.push('đã có lịch sử thanh toán')
      if ((datHang.list||[]).length > 0)   lyDo.push('đã có đơn đặt hàng')
      return NextResponse.json({ coTheXoa: lyDo.length === 0, lyDo })
    }

    const [nccResult, ttResult] = await Promise.all([
      getRecords(TABLES.NHA_CUNG_CAP, {
        limit: 200, sort: '-Id',
        fields: 'Id,Mã NCC,Tên NCC,Số điện thoại,Địa chỉ,Số TK ngân hàng,Công nợ NCC,Ghi chú,Ngân hàng'
      }),
      getRecords(TABLES.THANH_TOAN_NCC, {
        limit: 1000, sort: '-Id',
        fields: 'Mã NCC,Số tiền trả,Trạng thái'
      })
    ])

    const ttMap: Record<string,number> = {}
    for (const tt of (ttResult.list||[])) {
      if (tt['Trạng thái']==='Huỷ') continue
      const ma = tt['Mã NCC']||''
      ttMap[ma] = (ttMap[ma]||0) + Number(tt['Số tiền trả']||0)
    }

    const list = (nccResult.list||[]).map((ncc:any) => ({
      ...ncc,
      _tongDaTT: ttMap[ncc['Mã NCC']]||0,
    }))

    return NextResponse.json({ list, total: list.length })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const loai = body.loai

    if (loai === 'thanh-toan') {
      const { maNCC, maPhieuNhap, soTien, hinhThuc, nguoiTra, ghiChu, noiDung, conNo } = body
      if (!maNCC || !soTien) return NextResponse.json({message:'Thiếu thông tin'},{status:400})
      const maTT = body.maTT?.trim() || await taoMaTT()
      const conLai = Number(conNo||0) - Number(soTien||0)

      const r = await createRecord(TABLES.THANH_TOAN_NCC, {
        'Mã thanh toán':          maTT,
        'Ngày trả tiền NCC':      body.ngayTra || new Date().toISOString().split('T')[0],
        'Mã NCC':                 maNCC,
        'Mã phiếu nhập':          maPhieuNhap || '',
        'Nội dung':               noiDung || `Thanh toán NCC ${maNCC}`,
        'Loại thanh toán':        'Thanh toán một phần',
        'Số tiền trả':            Number(soTien),
        'Hình thức':              hinhThuc || 'Tiền mặt',
        'Người trả':              nguoiTra || session.hoTen || session.tenDangNhap,
        'Ghi chú':                ghiChu || '',
        'Số tiền còn lại sau TT': conLai,
        'Trạng thái':             'Đã xác nhận',
      })

      const nccList = await getRecords(TABLES.NHA_CUNG_CAP, {
        where: `(Mã NCC,eq,${maNCC})`, limit:1, fields:'Id,Công nợ NCC'
      })
      const nccRec = nccList.list?.[0]
      if (nccRec) {
        const conNoMoi = Math.max(0, Number(nccRec['Công nợ NCC']||0) - Number(soTien))
        await updateRecord(TABLES.NHA_CUNG_CAP, Number(nccRec['Id']||nccRec['id']), {
          'Công nợ NCC': conNoMoi
        })
      }

      return NextResponse.json({ success:true, maTT, data:r })
    }

    if (!body['Tên NCC']?.trim()) return NextResponse.json({message:'Thiếu tên NCC'},{status:400})
    const maNCC = body['Mã NCC']?.trim() || await taoMaNCC()
    const r = await createRecord(TABLES.NHA_CUNG_CAP, {
      'Mã NCC':          maNCC,
      'Tên NCC':         body['Tên NCC'].trim(),
      'Số điện thoại':   body['Số điện thoại']||'',
      'Địa chỉ':         body['Địa chỉ']||'',
      'Số TK ngân hàng': body['Số TK ngân hàng']||'',
      'Ngân hàng':       body['Ngân hàng']||'',
      'Công nợ NCC':     0,
      'Ghi chú':         body['Ghi chú']||'',
    })
    return NextResponse.json({ success:true, maNCC, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const { id, loai, ...data } = body
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    if (loai === 'thanh-toan') {
      const ttRec = await getRecords(TABLES.THANH_TOAN_NCC, {
        where: `(Id,eq,${id})`, limit:1,
        fields:'Id,Mã NCC,Số tiền trả,Trạng thái'
      })
      const tt = ttRec.list?.[0]
      if (tt && tt['Trạng thái']!=='Huỷ') {
        const maNCC = tt['Mã NCC']
        const soTien = Number(tt['Số tiền trả']||0)
        await updateRecord(TABLES.THANH_TOAN_NCC, Number(id), {'Trạng thái':'Huỷ'})
        const nccList = await getRecords(TABLES.NHA_CUNG_CAP, {
          where: `(Mã NCC,eq,${maNCC})`, limit:1, fields:'Id,Công nợ NCC'
        })
        const nccRec = nccList.list?.[0]
        if (nccRec) {
          await updateRecord(TABLES.NHA_CUNG_CAP, Number(nccRec['Id']||nccRec['id']), {
            'Công nợ NCC': Number(nccRec['Công nợ NCC']||0) + soTien
          })
        }
      }
      return NextResponse.json({ success:true })
    }

    const r = await updateRecord(TABLES.NHA_CUNG_CAP, Number(id), data)
    return NextResponse.json({ success:true, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    if (session.vaiTro !== 'Chủ cửa hàng')
      return NextResponse.json({message:'Chỉ chủ cửa hàng mới được xóa nhà cung cấp'},{status:403})

    const { searchParams } = new URL(req.url)
    const id    = searchParams.get('id')
    const maNCC = searchParams.get('maNCC')
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    // Kiểm tra lần cuối
    if (maNCC) {
      const nhapKho = await getRecords(TABLES.NHAP_KHO, {
        where:`(Mã NCC,eq,${maNCC})`, limit:1, fields:'Id'
      })
      if ((nhapKho.list||[]).length > 0)
        return NextResponse.json({message:'Không thể xóa — NCC đã có phiếu nhập kho. Hãy giữ lại để tra cứu lịch sử.'},{status:400})
    }

    await deleteRecord(TABLES.NHA_CUNG_CAP, Number(id))
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

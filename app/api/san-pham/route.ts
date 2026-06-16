// app/api/san-pham/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES, writeLog } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaSPMoi(): Promise<string> {
  try {
    const result = await getRecords(TABLES.SAN_PHAM, { limit:1, sort:'-Id', fields:'Mã SP' })
    const spCuoi = result.list?.[0]
    if (spCuoi?.['Mã SP']) {
      const ma = spCuoi['Mã SP'] as string
      const parts = ma.split('-')
      const so = parseInt(parts[parts.length-1]||'0')
      if (!isNaN(so)) return `SP-${String(so+1).padStart(3,'0')}`
    }
    return 'SP-001'
  } catch { return `SP-${Date.now().toString().slice(-4)}` }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(request.url)
    const loai = searchParams.get('loai')
    const maSP = searchParams.get('maSP')
    const limit = Number(searchParams.get('limit')||500)

    // Kiểm tra có thể xóa SP không
    if (loai === 'kiem-tra-xoa' && maSP) {
      const [chiTietDon, nhapKho] = await Promise.all([
        getRecords(TABLES.CHI_TIET_DON, { where:`(Mã SP,eq,${maSP})`, limit:1, fields:'Id' }),
        getRecords(TABLES.NHAP_KHO,     { where:`(Mã SP,eq,${maSP})`, limit:1, fields:'Id' }),
      ])
      const lyDo: string[] = []
      if ((chiTietDon.list||[]).length > 0) lyDo.push('sản phẩm đã có trong đơn hàng')
      if ((nhapKho.list||[]).length > 0)    lyDo.push('sản phẩm đã có phiếu nhập kho')
      return NextResponse.json({ coTheXoa: lyDo.length === 0, lyDo })
    }

    const result = await getRecords(TABLES.SAN_PHAM, { limit, sort:'-Id' })
    return NextResponse.json(result)
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await request.json()
    const maSP = body['Mã SP']?.trim() || await taoMaSPMoi()
    const result = await createRecord(TABLES.SAN_PHAM, { ...body, 'Mã SP': maSP })
    if (!result) return NextResponse.json({message:'Lỗi tạo sản phẩm'},{status:500})
    return NextResponse.json({ success:true, data:result })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    const result = await updateRecord(TABLES.SAN_PHAM, id, data)
    writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Sửa',bang:'Sản phẩm',
      maBanGhi:String(id),moTa:'Sửa sản phẩm id='+id})
    return NextResponse.json({ success:true, data:result })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    if (session.vaiTro !== 'Chủ cửa hàng')
      return NextResponse.json({message:'Chỉ chủ cửa hàng mới được xóa sản phẩm'},{status:403})
    const { searchParams } = new URL(request.url)
    const id   = searchParams.get('id')
    const maSP = searchParams.get('maSP')
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    // Kiểm tra lần cuối
    if (maSP) {
      const chiTietDon = await getRecords(TABLES.CHI_TIET_DON, {
        where:`(Mã SP,eq,${maSP})`, limit:1, fields:'Id'
      })
      if ((chiTietDon.list||[]).length > 0)
        return NextResponse.json({message:'Không thể xóa — sản phẩm đã có trong đơn hàng. Hãy đổi trạng thái hoặc ẩn sản phẩm thay vì xóa.'},{status:400})
    }

    await deleteRecord(TABLES.SAN_PHAM, Number(id))
    writeLog({maNV:session.maNV||'',tenNV:session.hoTen||'',hanhDong:'Xóa',bang:'Sản phẩm',
      maBanGhi:maSP||String(id),moTa:'Xóa sản phẩm: '+(maSP||id)})
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}
